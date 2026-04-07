"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  TrendingUp,
  Handshake,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskReportData } from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

type RiskLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

function riskColors(level: RiskLevel) {
  switch (level) {
    case "HIGH":
      return {
        badge: "bg-red-500/20 text-red-400 border border-red-500/40",
        border: "border-l-red-500",
        accent: "bg-red-500",
        text: "text-red-400",
        stat: "bg-red-500/10 border-red-500/30",
      };
    case "MEDIUM":
      return {
        badge: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
        border: "border-l-amber-500",
        accent: "bg-amber-500",
        text: "text-amber-400",
        stat: "bg-amber-500/10 border-amber-500/30",
      };
    case "LOW":
      return {
        badge: "bg-green-500/20 text-green-400 border border-green-500/40",
        border: "border-l-green-500",
        accent: "bg-green-500",
        text: "text-green-400",
        stat: "bg-green-500/10 border-green-500/30",
      };
    default:
      return {
        badge: "bg-slate-500/20 text-slate-400 border border-slate-500/40",
        border: "border-l-slate-500",
        accent: "bg-slate-500",
        text: "text-slate-400",
        stat: "bg-slate-500/10 border-slate-500/30",
      };
  }
}

function formatINR(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
      <span className="text-slate-400">{icon}</span>
      <h3 className="text-base font-semibold tracking-wide text-white uppercase">
        {children}
      </h3>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: "HIGH" | "MEDIUM" | "LOW" }) {
  const colors =
    level === "HIGH"
      ? "bg-red-500/20 text-red-400 border border-red-500/40"
      : level === "MEDIUM"
      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
      : "bg-green-500/20 text-green-400 border border-green-500/40";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase",
        colors
      )}
    >
      {level}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RiskReportProps {
  data?: RiskReportData;
  fallbackText?: string;
  riskLevel?: "HIGH" | "MEDIUM" | "LOW";
}

export function RiskReport({ data, fallbackText, riskLevel }: RiskReportProps) {
  // ── Fallback: render plain text when no structured data ────────
  if (!data || data.overall_risk_level === "UNKNOWN") {
    const paragraphs = (fallbackText || "No risk report available.")
      .split("\n")
      .filter((p) => p.trim());
    const level = (riskLevel || "UNKNOWN") as RiskLevel;
    const colors = riskColors(level);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-800 p-2">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Risk Report</h3>
              <p className="text-sm text-slate-400">AI-generated analysis</p>
            </div>
          </div>
          {level !== "UNKNOWN" && (
            <span
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold tracking-widest uppercase",
                colors.badge
              )}
            >
              {level}
            </span>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          {paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="text-slate-300 leading-relaxed mb-4 last:mb-0"
            >
              {p}
            </motion.p>
          ))}
        </div>
      </motion.div>
    );
  }

  const level = data.overall_risk_level as RiskLevel;
  const colors = riskColors(level);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <Section index={0}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800 p-3">
              <FileText className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Risk Report</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                AI-powered analysis of your loan contract
              </p>
            </div>
          </div>
          <span
            className={cn(
              "self-start sm:self-auto rounded-2xl px-6 py-3 text-lg font-extrabold tracking-widest uppercase shadow-lg",
              colors.badge
            )}
          >
            {level} RISK
          </span>
        </div>
      </Section>

      {/* ── Executive Summary ───────────────────────────────────── */}
      {data.summary && (
        <Section index={1}>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div
              className={cn(
                "border-l-4 p-6",
                colors.border
              )}
            >
              <SectionTitle icon={<FileText className="h-4 w-4" />}>
                Executive Summary
              </SectionTitle>
              <p className="text-slate-300 leading-8 text-[15px]">
                {data.summary}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* ── Dangerous Clauses ───────────────────────────────────── */}
      {data.top_dangerous_clauses && data.top_dangerous_clauses.length > 0 && (
        <Section index={2}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <SectionTitle icon={<AlertTriangle className="h-4 w-4" />}>
              ⚠ Dangerous Clauses Found
            </SectionTitle>
            <div className="space-y-4">
              {data.top_dangerous_clauses.map((clause, i) => {
                const clauseBorder =
                  clause.severity === "HIGH"
                    ? "border-l-red-500"
                    : clause.severity === "MEDIUM"
                    ? "border-l-amber-500"
                    : "border-l-green-500";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm",
                      "border-l-4 p-5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07]",
                      clauseBorder
                    )}
                  >
                    {/* Glassmorphism hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

                    <div className="relative flex items-start justify-between gap-3 mb-3">
                      <p className="font-semibold text-white leading-snug">
                        {clause.title}
                      </p>
                      <SeverityBadge level={clause.severity} />
                    </div>
                    <div className="relative space-y-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                          What it means
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-slate-300">
                          {clause.description}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                          Why it matters
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400 italic">
                          {clause.impact}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* ── Financial Stress Assessment ─────────────────────────── */}
      {data.financial_stress_assessment && (
        <Section index={3}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <SectionTitle icon={<TrendingUp className="h-4 w-4" />}>
              📊 Financial Stress Assessment
            </SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* High stress stat */}
              <div
                className={cn(
                  "rounded-xl border p-4",
                  "bg-red-500/10 border-red-500/30"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-1">
                  High-Stress Borrowers
                </p>
                <p className="text-3xl font-extrabold text-white">
                  {data.financial_stress_assessment.high_stress_percentage.toFixed(
                    1
                  )}
                  <span className="text-lg font-semibold text-slate-400">
                    %
                  </span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Avg EMI:{" "}
                  <span className="font-semibold text-red-300">
                    {formatINR(
                      data.financial_stress_assessment.high_stress_avg_emi
                    )}
                  </span>
                </p>
              </div>
              {/* Low stress stat */}
              <div
                className={cn(
                  "rounded-xl border p-4",
                  "bg-green-500/10 border-green-500/30"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-1">
                  Low-Stress Borrowers
                </p>
                <p className="text-3xl font-extrabold text-white">
                  {(
                    100 -
                    data.financial_stress_assessment.high_stress_percentage
                  ).toFixed(1)}
                  <span className="text-lg font-semibold text-slate-400">
                    %
                  </span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Avg EMI:{" "}
                  <span className="font-semibold text-green-300">
                    {formatINR(
                      data.financial_stress_assessment.low_stress_avg_emi
                    )}
                  </span>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-7 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              {data.financial_stress_assessment.interpretation}
            </p>
          </div>
        </Section>
      )}

      {/* ── Recommendations ─────────────────────────────────────── */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Section index={4}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <SectionTitle icon={<CheckCircle2 className="h-4 w-4" />}>
              ✅ What You Should Do
            </SectionTitle>
            <ul className="space-y-3">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-green-400" />
                  <span className="text-sm leading-relaxed text-slate-300">
                    {rec}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* ── Sections to Negotiate ───────────────────────────────── */}
      {data.sections_to_negotiate && data.sections_to_negotiate.length > 0 && (
        <Section index={5}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <SectionTitle icon={<Handshake className="h-4 w-4" />}>
              🤝 Negotiate These Clauses
            </SectionTitle>
            <div className="space-y-3">
              {data.sections_to_negotiate.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-amber-300 leading-snug">
                    {item.clause}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── Borrower Rights ─────────────────────────────────────── */}
      {data.borrower_rights && data.borrower_rights.length > 0 && (
        <Section index={6}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <SectionTitle icon={<Shield className="h-4 w-4" />}>
              ⚖ Your Legal Rights
            </SectionTitle>
            <ul className="space-y-3">
              {data.borrower_rights.map((right, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Shield className="h-5 w-5 shrink-0 mt-0.5 text-blue-400" />
                  <span className="text-sm leading-relaxed text-slate-300">
                    {right}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </div>
  );
}
