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


def generate_risk_report(filename, chunks, flagged_clauses, stress_analysis, loan_stats):
    """
    Layer 7 — AI Orchestrator
    Takes all pipeline outputs and generates a structured JSON risk report.
    Returns a tuple: (raw_text_str, parsed_dict_or_None)
    """
    import json
    from groq import Groq

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    # ── Build context for the LLM ───────────────────────────────
    flagged_summary = "\n".join([
        f"- Clause: '{c['contract_chunk'][:150]}'\n"
        f"  Similar complaint: '{c['similar_complaint'][:150]}'\n"
        f"  Issue type: {c['issue']} | Product: {c['product']}\n"
        f"  Similarity score: {c['similarity_score']:.2f}"
        for c in flagged_clauses[:5]  # top 5 only to save tokens
    ])

    stress_summary = "\n".join([
        f"- Clause: '{s['clause'][:100]}'\n"
        f"  Stress level: {s['stress_level']} | Probability: {s['stress_probability']}"
        for s in stress_analysis
    ])

    high_stress_pct = loan_stats.get('high_stress_rate', 0)
    avg_emi_high    = loan_stats.get('avg_emi_high_stress', 0)
    avg_emi_low     = loan_stats.get('avg_emi_low_stress', 0)

    system_prompt = (
        "You are a senior financial contract risk analyst specialising in Indian loan agreements. "
        "You help ordinary borrowers understand their rights under the RBI Guidelines on Fair Practices Code, "
        "the Consumer Protection Act 2019, and the SARFAESI Act. "
        "Respond ONLY with valid JSON — no markdown fences, no backticks, no preamble, no explanation outside the JSON object. "
        "Currency is always Indian Rupees (₹). Use Indian legal references, not American ones."
    )

    user_prompt = f"""Analyze this Indian loan contract and return a JSON risk report.

CONTRACT FILE: {filename}
TOTAL CLAUSES ANALYZED: {len(chunks)}

FLAGGED CLAUSES (matched against {loan_stats.get('total_loans', 0)} historical complaints):
{flagged_summary if flagged_summary else "No flagged clauses found."}

FINANCIAL STRESS DATA:
- Total loans in database: {loan_stats.get('total_loans', 0)}
- High stress rate: {high_stress_pct}%
- Avg EMI high stress borrowers: ₹{avg_emi_high}
- Avg EMI low stress borrowers: ₹{avg_emi_low}

STRESS ANALYSIS PER CLAUSE:
{stress_summary if stress_summary else "No stress data available."}

Return ONLY this JSON structure (fill every field, keep language plain and non-technical):

{{
  "overall_risk_level": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<one paragraph plain-English summary of the overall contract risk>",
  "top_dangerous_clauses": [
    {{
      "title": "<short clause name>",
      "description": "<what this clause says in plain language>",
      "impact": "<why this is dangerous for the borrower>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }}
  ],
  "financial_stress_assessment": {{
    "high_stress_percentage": {high_stress_pct},
    "high_stress_avg_emi": {avg_emi_high},
    "low_stress_avg_emi": {avg_emi_low},
    "interpretation": "<plain English explanation of what these numbers mean for this borrower>"
  }},
  "recommendations": [
    "<specific action the borrower should take>"
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
        max_tokens=1500
    )

    raw_text = response.choices[0].message.content

    # ── Parse JSON; fall back gracefully on failure ─────────────
    try:
        # Strip accidental markdown fences the model may still add
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
def process_document(filepath: str) -> dict:

    filename = os.path.basename(filepath)
    print(f"[Worker] Starting: {filename}")

    # ── Stage 1: Parse PDF ─────────────────────────────────────────
    from unstructured.partition.pdf import partition_pdf
    elements = partition_pdf(filepath)
    raw_text = "\n".join([str(el) for el in elements])
    print(f"[Worker] Parsed {len(elements)} elements from PDF")

    # ── Stage 2: Chunk with LangChain ──────────────────────────────
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    chunks = splitter.split_text(raw_text)
    print(f"[Worker] Split into {len(chunks)} chunks")

    # ── Stage 3: Embed with HuggingFace ────────────────────────────
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(chunks, show_progress_bar=False)
    print(f"[Worker] Generated {len(embeddings)} embeddings")

    # ── Stage 4: RAG - Search similar complaints ───────────────────
    print("[Worker] Running Stage 4: RAG Comparison")
    index, metadata = load_rag()
    rag_available = False
    flagged_clauses = []

    if index is not None and metadata is not None:
        rag_available = True
        print("[Worker] FAISS index loaded. Searching for matches...")
        import numpy as np

        chunk_embeddings = np.array(embeddings).astype('float32')
        k = 5
        distances, indices = index.search(chunk_embeddings, k)

        for i, chunk in enumerate(chunks):
            for j in range(k):
                dist = distances[i][j]
                idx = indices[i][j]
                sim_score = 1.0 - (dist / 2.0)

                if sim_score > 0.3:
                    flagged_clauses.append({
                        "contract_chunk": chunk,
                        "similar_complaint": metadata[int(idx)]["text"][:300],
                        "product": metadata[int(idx)]["product"],
                        "issue": metadata[int(idx)]["issue"],
                        "similarity_score": float(sim_score)
                    })

        flagged_clauses.sort(key=lambda x: x["similarity_score"], reverse=True)
        flagged_clauses = flagged_clauses[:10]
        print(f"[Worker] Found {len(flagged_clauses)} flagged clauses.")
    else:
        print("[Worker] FAISS index not found. Skipping RAG.")

    # ── Stage 5: MCP — Financial Stress Analysis ───────────────────
    import requests

    mcp_url = os.environ.get("MCP_SERVER_URL", "http://mcp_server:6000")
    stress_results = []
    loan_stats = {}

    try:
        stats_response = requests.get(f"{mcp_url}/loan_stats")
        loan_stats = stats_response.json()

        for clause in flagged_clauses[:3]:
            stress_response = requests.post(
                f"{mcp_url}/predict_stress",
                json={
                    "age": 35,
                    "monthly_income": 50000,
                    "loan_amount": 500000,
                    "interest_rate": 12.0,
                    "tenure_years": 5,
                    "monthly_emi": 11000,
                    "dependents": 1,
                    "credit_score": 700,
                    "employment_type": "salaried"
                }
            )
            stress_data = stress_response.json()
            stress_results.append({
                "clause": clause["contract_chunk"][:100],
                "stress_level": stress_data.get("stress_level"),
                "stress_probability": stress_data.get("stress_probability"),
                "risk_flag": stress_data.get("risk_flag")
            })

        print(f"[Worker] MCP stress analysis complete")

    except Exception as e:
        print(f"[Worker] MCP server unavailable: {e}")
        loan_stats = {}

    # ── Stage 6: Generate AI Risk Report ───────────────────────────────────────
    print("[Worker] Running Stage 6: Generating AI risk report...")
    risk_report = ""
    risk_report_structured = None
    try:
        risk_report, risk_report_structured = generate_risk_report(
            filename=filename,
            chunks=chunks,
            flagged_clauses=flagged_clauses,
            stress_analysis=stress_results,
            loan_stats=loan_stats
        )
        print("[Worker] Risk report generated successfully")
    except Exception as e:
        print(f"[Worker] Risk report generation failed: {e}")
        risk_report = "Risk report generation failed. Please try again."
        risk_report_structured = {
            "overall_risk_level": "UNKNOWN",
            "summary": risk_report,
        }

    # ── Return final result ─────────────────────────────────────
    return {
        "filename": filename,
        "status": "complete",
        "total_elements": len(elements),
        "total_chunks": len(chunks),
        "flagged_clauses": flagged_clauses,
        "stress_analysis": stress_results,
        "loan_stats": loan_stats,
        "rag_available": rag_available,
        "risk_report": risk_report,
        "risk_report_structured": risk_report_structured,
        "message": "Analysis complete."
    }