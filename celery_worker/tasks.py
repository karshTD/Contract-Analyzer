from celery import Celery
import os

BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery = Celery("tasks", broker=BROKER_URL, backend=RESULT_BACKEND)


def load_rag():
    import faiss
    import pickle
    index_path = "/app/faiss_data/faiss_index.bin"
    metadata_path = "/app/faiss_data/faiss_metadata.pkl"
    if os.path.exists(index_path) and os.path.exists(metadata_path):
        index = faiss.read_index(index_path)
        with open(metadata_path, "rb") as f:
            metadata = pickle.load(f)
        return index, metadata
    return None, None


def _build_mcp_payload(profile: dict) -> dict:
    """
    Translate the frontend financial profile into the exact field names
    the MCP server's RandomForest model expects.

    Frontend sends:  age, income, loan_amount, emi_amount, tenure_months,
                     credit_score, employment_type, loan_type
    MCP expects:     age, monthly_income, loan_amount, interest_rate,
                     tenure_years, monthly_emi, dependents, credit_score,
                     employment_type (lowercase: salaried / business)
    """
    # Map employment type string to what the MCP model understands
    emp_raw = profile.get("employment_type", "Salaried").lower()
    if "self" in emp_raw:
        emp_mapped = "business"   # closest match for Self-Employed
    elif "business" in emp_raw:
        emp_mapped = "business"
    else:
        emp_mapped = "salaried"

    tenure_months = profile.get("tenure_months", 60)
    tenure_years = round(tenure_months / 12, 2)

    return {
        "age":             profile.get("age", 35),
        "monthly_income":  profile.get("income", 50000),
        "loan_amount":     profile.get("loan_amount", 500000),
        "interest_rate":   10.0,   # not collected by frontend; use market average
        "tenure_years":    tenure_years,
        "monthly_emi":     profile.get("emi_amount", 11000),
        "dependents":      1,      # not collected by frontend; use conservative default
        "credit_score":    profile.get("credit_score", 700),
        "employment_type": emp_mapped,
    }


def generate_risk_report(filename, chunks, flagged_clauses, stress_analysis,
                          loan_stats, financial_profile):
    """
    Layer 7 — AI Orchestrator
    Takes all pipeline outputs and generates a structured JSON risk report.
    Returns a tuple: (raw_text_str, parsed_dict_or_None)
    """
    import json
    from groq import Groq

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    # ── Build context strings ───────────────────────────────────
    flagged_summary = "\n".join([
        f"- Clause: '{c['contract_chunk'][:150]}'\n"
        f"  Similar complaint: '{c['similar_complaint'][:150]}'\n"
        f"  Issue type: {c['issue']} | Product: {c['product']}\n"
        f"  Similarity score: {c['similarity_score']:.2f}"
        for c in flagged_clauses[:5]
    ])

    stress_summary = "\n".join([
        f"- Clause: '{s['clause'][:100]}'\n"
        f"  Stress level: {s['stress_level']} | Probability: {s['stress_probability']}"
        for s in stress_analysis
    ])

    high_stress_pct = loan_stats.get("high_stress_rate", 0)
    avg_emi_high    = loan_stats.get("avg_emi_high_stress", 0)
    avg_emi_low     = loan_stats.get("avg_emi_low_stress", 0)

    # ── Compute derived metrics from the user's real numbers ────
    income      = financial_profile.get("income", 0)
    emi         = financial_profile.get("emi_amount", 0)
    loan_amount = financial_profile.get("loan_amount", 0)
    credit_score = financial_profile.get("credit_score", 0)
    tenure_months = financial_profile.get("tenure_months", 0)
    employment  = financial_profile.get("employment_type", "Unknown")
    loan_type   = financial_profile.get("loan_type", "Unknown")
    age         = financial_profile.get("age", 0)

    emi_ratio = round((emi / income * 100), 1) if income > 0 else 0
    emi_ratio_label = (
        "high (financially stressed)" if emi_ratio > 50
        else "moderate (watch carefully)" if emi_ratio > 35
        else "healthy"
    )

    # Personal stress result (first clause result, if available)
    personal_stress = stress_analysis[0] if stress_analysis else None
    personal_stress_level = personal_stress["stress_level"] if personal_stress else "Unknown"
    personal_stress_prob  = personal_stress["stress_probability"] if personal_stress else 0

    # ── Prompts ──────────────────────────────────────────────────
    system_prompt = (
        "You are a senior financial contract risk analyst specialising in Indian loan agreements. "
        "You help ordinary borrowers understand their rights under the RBI Guidelines on Fair Practices Code, "
        "the Consumer Protection Act 2019, and the SARFAESI Act. "
        "Respond ONLY with valid JSON — no markdown fences, no backticks, no preamble, no explanation outside the JSON object. "
        "Currency is always Indian Rupees (₹). Use Indian legal references, not American ones. "
        "Make every analysis SPECIFIC to this borrower's actual numbers — mention their EMI, income, credit score, and stress probability directly."
    )

    user_prompt = f"""Analyze this Indian loan contract for a specific borrower and return a personalized JSON risk report.

CONTRACT FILE: {filename}
TOTAL CLAUSES ANALYZED: {len(chunks)}

BORROWER PROFILE:
- Age: {age} | Employment: {employment} | Loan Type: {loan_type}
- Monthly Income: ₹{income:,.0f}
- Monthly EMI: ₹{emi:,.0f}
- EMI-to-Income Ratio: {emi_ratio}% — {emi_ratio_label}
- Loan Amount: ₹{loan_amount:,.0f}
- Tenure: {tenure_months} months ({round(tenure_months/12, 1)} years)
- Credit Score: {credit_score}
- ML Stress Prediction: {personal_stress_level} (probability: {personal_stress_prob})

FLAGGED CLAUSES (matched against {loan_stats.get('total_loans', 0)} historical complaints):
{flagged_summary if flagged_summary else "No flagged clauses found."}

POPULATION STRESS BENCHMARKS (from our loan database):
- High stress rate across all borrowers: {high_stress_pct}%
- Average EMI of high-stress borrowers: ₹{avg_emi_high}
- Average EMI of low-stress borrowers: ₹{avg_emi_low}

Return ONLY this JSON structure. Reference the borrower's ACTUAL numbers (income, EMI ratio, credit score, stress probability) throughout — do not write generic advice:

{{
  "overall_risk_level": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<one paragraph specifically about THIS borrower's risk — mention their ₹{emi:,.0f} EMI, {emi_ratio}% ratio, and {personal_stress_level} stress prediction>",
  "top_dangerous_clauses": [
    {{
      "title": "<short clause name>",
      "description": "<what this clause says in plain language>",
      "impact": "<why this is dangerous specifically for someone with a {emi_ratio}% EMI ratio and {credit_score} credit score>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }}
  ],
  "financial_stress_assessment": {{
    "high_stress_percentage": {high_stress_pct},
    "high_stress_avg_emi": {avg_emi_high},
    "low_stress_avg_emi": {avg_emi_low},
    "personal_stress_level": "{personal_stress_level}",
    "personal_stress_probability": {personal_stress_prob},
    "emi_to_income_ratio": {emi_ratio},
    "interpretation": "<explain what {personal_stress_level} stress at {personal_stress_prob} probability means for this borrower with ₹{income:,.0f} income — compare their ₹{emi:,.0f} EMI against the ₹{avg_emi_high} average for high-stress borrowers>"
  }},
  "recommendations": [
    "<specific action for THIS borrower given their {emi_ratio}% EMI ratio>"
  ],
  "sections_to_negotiate": [
    {{
      "clause": "<clause name>",
      "action": "<specific negotiation action>"
    }}
  ],
  "borrower_rights": [
    "<specific right under Indian law (RBI guidelines / Consumer Protection Act 2019 / SARFAESI Act)>"
  ]
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=1800,
    )

    raw_text = response.choices[0].message.content

    # ── Parse JSON; fall back gracefully on failure ─────────────
    try:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```", 2)[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.rsplit("```", 1)[0].strip()
        structured = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError, IndexError) as exc:
        print(f"[Worker] JSON parse failed ({exc}); using plain text fallback.")
        structured = {
            "overall_risk_level": "UNKNOWN",
            "summary": raw_text,
        }

    return raw_text, structured


@celery.task(name="tasks.process_document")
def process_document(filepath: str, financial_profile: dict = None) -> dict:
    """
    Main analysis pipeline. Accepts an optional financial_profile dict
    with keys: age, income, loan_amount, emi_amount, tenure_months,
    credit_score, employment_type, loan_type.
    Falls back to safe defaults if not provided.
    """
    if financial_profile is None:
        financial_profile = {}

    # Fill in any missing keys with defaults
    defaults = {
        "age": 35, "income": 50000, "loan_amount": 500000,
        "emi_amount": 11000, "tenure_months": 60,
        "credit_score": 700, "employment_type": "Salaried",
        "loan_type": "Personal Loan",
    }
    for k, v in defaults.items():
        financial_profile.setdefault(k, v)

    filename = os.path.basename(filepath)
    print(f"[Worker] Starting: {filename}")
    print(f"[Worker] Financial profile received: {financial_profile}")

    # ── Stage 1: Parse PDF ──────────────────────────────────────
    from unstructured.partition.pdf import partition_pdf
    elements = partition_pdf(filepath)
    raw_text = "\n".join([str(el) for el in elements])
    print(f"[Worker] Parsed {len(elements)} elements from PDF")

    # ── Stage 2: Chunk with LangChain ──────────────────────────
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    chunks = splitter.split_text(raw_text)
    print(f"[Worker] Split into {len(chunks)} chunks")

    # ── Stage 3: Embed with HuggingFace ────────────────────────
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(chunks, show_progress_bar=False)
    print(f"[Worker] Generated {len(embeddings)} embeddings")

    # ── Stage 4: RAG - Search similar complaints ────────────────
    print("[Worker] Running Stage 4: RAG Comparison")
    index, metadata = load_rag()
    rag_available = False
    flagged_clauses = []

    if index is not None and metadata is not None:
        rag_available = True
        print("[Worker] FAISS index loaded. Searching for matches...")
        import numpy as np

        chunk_embeddings = np.array(embeddings).astype("float32")
        k = 5
        distances, indices = index.search(chunk_embeddings, k)

        seen_chunks = set()
        for i, chunk in enumerate(chunks):
            # Deduplicate: skip if this exact chunk text was already flagged
            chunk_key = chunk[:100]
            if chunk_key in seen_chunks:
                continue
            for j in range(k):
                dist = distances[i][j]
                idx  = indices[i][j]
                sim_score = 1.0 - (dist / 2.0)
                if sim_score > 0.3:
                    seen_chunks.add(chunk_key)
                    flagged_clauses.append({
                        "contract_chunk":   chunk,
                        "similar_complaint": metadata[int(idx)]["text"][:300],
                        "product":          metadata[int(idx)]["product"],
                        "issue":            metadata[int(idx)]["issue"],
                        "similarity_score": float(sim_score),
                        "matched_complaint": metadata[int(idx)]["text"][:300],
                    })
                    break   # one match per chunk is enough

        flagged_clauses.sort(key=lambda x: x["similarity_score"], reverse=True)
        flagged_clauses = flagged_clauses[:10]
        print(f"[Worker] Found {len(flagged_clauses)} flagged clauses.")
    else:
        print("[Worker] FAISS index not found. Skipping RAG.")

    # ── Stage 5: MCP — Personalized Financial Stress Analysis ───
    import requests

    mcp_url = os.environ.get("MCP_SERVER_URL", "http://mcp_server:6000")
    stress_results = []
    loan_stats = {}

    # Build the MCP payload from the real user profile
    mcp_payload = _build_mcp_payload(financial_profile)
    print(f"[Worker] MCP payload: {mcp_payload}")

    try:
        stats_response = requests.get(f"{mcp_url}/loan_stats", timeout=10)
        loan_stats = stats_response.json()

        # Run one stress prediction with the user's real data,
        # then attach it to each of the top 3 flagged clauses for the report.
        stress_response = requests.post(
            f"{mcp_url}/predict_stress",
            json=mcp_payload,
            timeout=10,
        )
        stress_data = stress_response.json()
        print(f"[Worker] Stress prediction result: {stress_data}")

        # Attach the same personal prediction to each top clause
        for clause in flagged_clauses[:3]:
            stress_results.append({
                "clause":             clause["contract_chunk"][:100],
                "stress_level":       stress_data.get("stress_level", "Unknown"),
                "stress_probability": stress_data.get("stress_probability", 0),
                "risk_flag":          stress_data.get("risk_flag", False),
            })

        print(f"[Worker] MCP stress analysis complete: {stress_data.get('stress_level')}")

    except Exception as e:
        print(f"[Worker] MCP server unavailable: {e}")
        loan_stats = {}

    # ── Stage 6: Generate AI Risk Report ───────────────────────
    print("[Worker] Running Stage 6: Generating AI risk report...")
    risk_report = ""
    risk_report_structured = None
    try:
        risk_report, risk_report_structured = generate_risk_report(
            filename=filename,
            chunks=chunks,
            flagged_clauses=flagged_clauses,
            stress_analysis=stress_results,
            loan_stats=loan_stats,
            financial_profile=financial_profile,
        )
        print("[Worker] Risk report generated successfully")
    except Exception as e:
        print(f"[Worker] Risk report generation failed: {e}")
        risk_report = "Risk report generation failed. Please try again."
        risk_report_structured = {
            "overall_risk_level": "UNKNOWN",
            "summary": risk_report,
        }

    # ── Return final result ────────────────────────────────────
    return {
        "filename":              filename,
        "status":                "complete",
        "total_elements":        len(elements),
        "total_chunks":          len(chunks),
        "flagged_clauses":       flagged_clauses,
        "stress_analysis":       stress_results,
        "loan_stats":            loan_stats,
        "financial_profile":     financial_profile,
        "rag_available":         rag_available,
        "risk_report":           risk_report,
        "risk_report_structured": risk_report_structured,
        "message":               "Analysis complete.",
    }
