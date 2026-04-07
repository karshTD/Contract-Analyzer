import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "http://localhost:5000";

const STAGES = [
  { id: 1, label: "Parsing document", desc: "Extracting elements from PDF" },
  { id: 2, label: "Chunking text", desc: "Splitting into analysis segments" },
  { id: 3, label: "Embedding clauses", desc: "Generating semantic vectors" },
  { id: 4, label: "Searching complaints", desc: "Matching against 50k records" },
  { id: 5, label: "Running stress model", desc: "ML risk prediction" },
  { id: 6, label: "Generating report", desc: "LLM legal analysis" },
];

function getRiskLevel(report) {
  if (!report) return null;
  const upper = report.toUpperCase();
  if (upper.includes("HIGH")) return "HIGH";
  if (upper.includes("MEDIUM")) return "MEDIUM";
  if (upper.includes("LOW")) return "LOW";
  return null;
}

function RiskBadge({ level }) {
  const colors = {
    HIGH: { bg: "#7C1F1F", text: "#FECACA", border: "#991B1B" },
    MEDIUM: { bg: "#78350F", text: "#FDE68A", border: "#92400E" },
    LOW: { bg: "#14532D", text: "#BBF7D0", border: "#166534" },
  };
  const c = colors[level] || colors.MEDIUM;
  return (
    <span style={{
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      borderRadius: "4px", padding: "2px 10px",
      fontSize: "11px", fontFamily: "var(--font-mono)",
      letterSpacing: "0.08em", fontWeight: 600,
      textTransform: "uppercase",
    }}>
      {level} RISK
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "#161410",
      border: "1px solid #2A2520",
      borderRadius: "8px",
      padding: "16px 20px",
    }}>
      <div style={{ fontSize: "11px", color: "#6B6560", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: "6px", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 600, color: "#D4A843", fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "11px", color: "#6B6560", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function ProcessingStage({ stageIndex }) {
  return (
    <div style={{ margin: "32px 0" }}>
      {STAGES.map((stage, i) => {
        const done = i < stageIndex;
        const active = i === stageIndex;
        return (
          <div key={stage.id} style={{
            display: "flex", alignItems: "center", gap: "16px",
            padding: "12px 0",
            borderBottom: "1px solid #1E1A16",
            opacity: done ? 0.5 : active ? 1 : 0.3,
            transition: "opacity 0.4s ease",
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: done ? "#1A3A1A" : active ? "#3A2800" : "#161410",
              border: `1px solid ${done ? "#2D6A2D" : active ? "#D4A843" : "#2A2520"}`,
              transition: "all 0.4s ease",
            }}>
              {done
                ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#4ADE80" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : active
                  ? <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D4A843", display: "block", animation: "pulse 1.2s ease-in-out infinite" }} />
                  : <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2A2520", display: "block" }} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", color: active ? "#F5E6C8" : done ? "#8A8075" : "#4A4540", fontWeight: active ? 500 : 400 }}>
                {stage.label}
              </div>
              {active && (
                <div style={{ fontSize: "12px", color: "#6B6560", marginTop: "2px" }}>
                  {stage.desc}
                </div>
              )}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: done ? "#4ADE80" : active ? "#D4A843" : "#2A2520" }}>
              {done ? "done" : active ? "running" : "waiting"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlaggedClause({ clause, index }) {
  const [open, setOpen] = useState(false);
  const score = clause.similarity_score ?? 0;
  const pct = Math.round(score * 100);
  const color = pct > 60 ? "#EF4444" : pct > 45 ? "#F59E0B" : "#D4A843";

  return (
    <div style={{
      border: "1px solid #2A2520",
      borderLeft: `3px solid ${color}`,
      borderRadius: "6px",
      marginBottom: "10px",
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none",
          padding: "14px 16px", cursor: "pointer",
          display: "flex", alignItems: "flex-start", gap: "12px", textAlign: "left",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#6B6560", minWidth: "24px", marginTop: "2px" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "13px", color: "#C4B49A", margin: "0 0 6px",
            lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: open ? "unset" : 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {clause.contract_chunk}
          </p>
          {open && clause.matched_complaint && (
            <div style={{ marginTop: "10px", padding: "10px 12px", background: "#0E0C0A", borderRadius: "4px", borderLeft: "2px solid #3A2800" }}>
              <div style={{ fontSize: "10px", color: "#6B6560", fontFamily: "var(--font-mono)", marginBottom: "4px", letterSpacing: "0.06em" }}>MATCHED COMPLAINT</div>
              <p style={{ fontSize: "12px", color: "#8A7A65", margin: 0, lineHeight: 1.6 }}>
                {clause.matched_complaint.length > 300 ? clause.matched_complaint.slice(0, 300) + "…" : clause.matched_complaint}
              </p>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color, fontWeight: 600 }}>
            {pct}%
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", marginTop: "2px" }}>
            <path d="M2 3.5l3 3 3-3" stroke="#6B6560" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </button>
    </div>
  );
}

function ReportSection({ report }) {
  const lines = report.split("\n").filter(Boolean);
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#C4B49A", lineHeight: 1.8 }}>
      {lines.map((line, i) => {
        const isBold = line.startsWith("**") && line.endsWith("**");
        const isHeading = /^\d+\./.test(line) || line.startsWith("##") || line.startsWith("#");
        const clean = line.replace(/\*\*/g, "").replace(/^#+\s*/, "");

        if (isBold || isHeading) {
          return (
            <p key={i} style={{ fontWeight: 700, color: "#E8D5A8", fontSize: "14px", marginTop: "20px", marginBottom: "6px", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
              {clean}
            </p>
          );
        }
        return (
          <p key={i} style={{ fontSize: "14px", margin: "0 0 10px", color: "#A89880" }}>
            {clean}
          </p>
        );
      })}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("upload"); // upload | processing | report
  const [dragging, setDragging] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [activeTab, setActiveTab] = useState("clauses");
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  const estimateStage = useCallback((data) => {
    if (data.risk_report) return 6;
    if (data.stress_analysis) return 5;
    if (data.flagged_clauses?.length) return 4;
    if (data.total_chunks > 0) return 3;
    if (data.total_elements > 0) return 2;
    return 1;
  }, []);

  const upload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setFileName(file.name);
    setError(null);
    setScreen("processing");
    setStageIndex(0);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      setTaskId(data.task_id);
    } catch (e) {
      setError(e.message);
      setScreen("upload");
    }
  };

  useEffect(() => {
    if (!taskId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${taskId}`);
        const data = await res.json();
        const stage = estimateStage(data);
        setStageIndex(stage);

        if (data.status === "SUCCESS" && data.result) {
          clearInterval(pollRef.current);
          setResult(data.result);
          setScreen("report");
        } else if (data.status === "FAILURE")  {
          clearInterval(pollRef.current);
          setError("Analysis failed. Please try again.");
          setScreen("upload");
        }
      } catch {
        // keep polling silently
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [taskId, estimateStage]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const reset = () => {
    setScreen("upload");
    setTaskId(null);
    setResult(null);
    setError(null);
    setFileName("");
    setStageIndex(0);
    clearInterval(pollRef.current);
  };

  const riskLevel = result ? getRiskLevel(result.risk_report) : null;
  const flagged = result?.flagged_clauses ?? [];
  const stats = result?.loan_stats ?? {};
  const stress = result?.stress_analysis ?? {};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0806 !important; }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease forwards; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0A0806; }
        ::-webkit-scrollbar-thumb { background: #2A2520; border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0A0806", fontFamily: "var(--font-sans)" }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid #1E1A16", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="1" width="11" height="14" rx="1.5" stroke="#D4A843" strokeWidth="1.2" />
              <path d="M5 5h7M5 8h7M5 11h4" stroke="#D4A843" strokeWidth="1" strokeLinecap="round" />
              <circle cx="14" cy="13" r="3.5" fill="#0A0806" stroke="#6B6560" strokeWidth="1" />
              <path d="M13 13l.8.8 1.4-1.4" stroke="#D4A843" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "#D4A843", letterSpacing: "0.04em" }}>
              CONTRACT ANALYZER
            </span>
          </div>
          {screen !== "upload" && (
            <button onClick={reset} style={{
              background: "none", border: "1px solid #2A2520", borderRadius: "4px",
              color: "#6B6560", fontSize: "12px", padding: "4px 12px", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
            }}>
              ← NEW ANALYSIS
            </button>
          )}
        </div>

        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 24px" }}>

          {/* UPLOAD SCREEN */}
          {screen === "upload" && (
            <div className="fade-in" style={{ paddingTop: "80px" }}>
              <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <h1 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: "36px", fontWeight: 500, color: "#F5E6C8", lineHeight: 1.2, marginBottom: "12px" }}>
                  Know what you're signing
                </h1>
                <p style={{ fontSize: "15px", color: "#6B6560", maxWidth: "420px", margin: "0 auto", lineHeight: 1.7 }}>
                  Upload your loan contract. Our system reads every clause, compares against 50,000 consumer complaints, and flags what's dangerous.
                </p>
              </div>

              {error && (
                <div style={{ background: "#1A0A0A", border: "1px solid #7C1F1F", borderRadius: "6px", padding: "10px 16px", marginBottom: "20px", fontSize: "13px", color: "#EF4444" }}>
                  {error}
                </div>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                style={{
                  border: `1px dashed ${dragging ? "#D4A843" : "#2A2520"}`,
                  borderRadius: "10px",
                  padding: "60px 40px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragging ? "#130F0A" : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ margin: "0 auto 16px", display: "block" }}>
                  <path d="M18 24V12M18 12l-5 5M18 12l5 5" stroke={dragging ? "#D4A843" : "#3A3530"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="6" y="28" width="24" height="2" rx="1" fill={dragging ? "#D4A843" : "#3A3530"} />
                </svg>
                <p style={{ fontSize: "14px", color: dragging ? "#D4A843" : "#4A4540", marginBottom: "6px" }}>
                  Drop your PDF here
                </p>
                <p style={{ fontSize: "12px", color: "#3A3530" }}>or click to browse — max 50MB</p>
                <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                  onChange={(e) => upload(e.target.files[0])} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "40px" }}>
                {[
                  { icon: "⚖", label: "Car & bike loans" },
                  { icon: "📋", label: "Personal loans" },
                  { icon: "🏦", label: "BNPL agreements" },
                ].map((item) => (
                  <div key={item.label} style={{ textAlign: "center", padding: "16px", border: "1px solid #1E1A16", borderRadius: "8px" }}>
                    <div style={{ fontSize: "18px", marginBottom: "6px" }}>{item.icon}</div>
                    <div style={{ fontSize: "12px", color: "#4A4540" }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROCESSING SCREEN */}
          {screen === "processing" && (
            <div className="fade-in" style={{ paddingTop: "64px" }}>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#6B6560", letterSpacing: "0.06em", marginBottom: "4px" }}>ANALYZING</div>
                <div style={{ fontSize: "16px", color: "#C4B49A", fontFamily: "'EB Garamond', serif" }}>
                  {fileName}
                </div>
              </div>
              <ProcessingStage stageIndex={stageIndex} />
              <p style={{ textAlign: "center", fontSize: "12px", color: "#3A3530", marginTop: "8px" }}>
                This takes 25–40 seconds. Don't close the tab.
              </p>
            </div>
          )}

          {/* REPORT SCREEN */}
          {screen === "report" && result && (
            <div className="fade-in" style={{ paddingTop: "48px", paddingBottom: "80px" }}>

              {/* Header row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#6B6560", letterSpacing: "0.06em", marginBottom: "6px" }}>ANALYSIS COMPLETE</div>
                  <div style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: "22px", color: "#F5E6C8", marginBottom: "8px" }}>
                    {result.filename}
                  </div>
                  {riskLevel && <RiskBadge level={riskLevel} />}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "32px" }}>
                <StatCard label="Clauses flagged" value={flagged.length} sub="risk threshold ≥ 0.3" />
                <StatCard label="Text chunks" value={result.total_chunks ?? "—"} sub="analyzed" />
                <StatCard
                  label="High stress rate"
                  value={stats.high_stress_rate != null ? `${stats.high_stress_rate}%` : "—"}
                  sub="of similar borrowers"
                />
                <StatCard
                  label="Avg EMI (high stress)"
                  value={stats.avg_emi_high_stress != null ? `₹${Math.round(stats.avg_emi_high_stress).toLocaleString("en-IN")}` : "—"}
                  sub="vs population"
                />
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "0", marginBottom: "24px", borderBottom: "1px solid #1E1A16" }}>
                {["clauses", "report"].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    background: "none", border: "none", padding: "10px 20px",
                    cursor: "pointer", fontSize: "13px",
                    color: activeTab === tab ? "#D4A843" : "#4A4540",
                    borderBottom: `2px solid ${activeTab === tab ? "#D4A843" : "transparent"}`,
                    fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
                    textTransform: "uppercase", fontSize: "11px",
                    transition: "color 0.15s",
                  }}>
                    {tab === "clauses" ? `Flagged Clauses (${flagged.length})` : "Risk Report"}
                  </button>
                ))}
              </div>

              {activeTab === "clauses" && (
                <div>
                  {flagged.length === 0
                    ? <p style={{ color: "#4A4540", fontSize: "14px" }}>No clauses were flagged above the similarity threshold.</p>
                    : flagged.map((clause, i) => <FlaggedClause key={i} clause={clause} index={i} />)
                  }
                </div>
              )}

              {activeTab === "report" && result.risk_report && (
                <div style={{ background: "#0E0C0A", border: "1px solid #1E1A16", borderRadius: "8px", padding: "28px 32px" }}>
                  <ReportSection report={result.risk_report} />
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}