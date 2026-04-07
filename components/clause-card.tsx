"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlaggedClause } from "@/lib/api";

interface ClauseCardProps {
  clause: FlaggedClause;
  index: number;
}

function getScoreColor(score: number): {
  bg: string;
  fill: string;
  text: string;
} {
  if (score >= 0.7) {
    return {
      bg: "bg-red-500/20",
      fill: "bg-red-500",
      text: "text-red-400",
    };
  }
  if (score >= 0.4) {
    return {
      bg: "bg-amber-500/20",
      fill: "bg-amber-500",
      text: "text-amber-400",
    };
  }
  return {
    bg: "bg-green-500/20",
    fill: "bg-green-500",
    text: "text-green-400",
  };
}

export function ClauseCard({ clause, index }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scoreColors = getScoreColor(clause.score);
  const scorePercent = Math.round(clause.score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07]"
    >
      {/* Glassmorphism effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative p-5">
        {/* Header with score */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-full p-1.5", scoreColors.bg)}>
              <AlertTriangle className={cn("h-4 w-4", scoreColors.text)} />
            </div>
            <span className={cn("text-sm font-medium", scoreColors.text)}>
              {scorePercent}% Match
            </span>
          </div>

          {/* Score bar */}
          <div className="flex-1 max-w-[120px]">
            <div className={cn("h-2 rounded-full overflow-hidden", scoreColors.bg)}>
              <motion.div
                className={cn("h-full rounded-full", scoreColors.fill)}
                initial={{ width: 0 }}
                animate={{ width: `${scorePercent}%` }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Clause text */}
        <div className="mb-4">
          <p className="font-mono text-sm leading-relaxed text-slate-300">{clause.clause}</p>
        </div>

        {/* Expandable matched complaint */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-left transition-colors hover:bg-white/10"
        >
          <span className="text-sm font-medium text-slate-400">Matched Complaint</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        <motion.div
          initial={false}
          animate={{
            height: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mt-3 rounded-lg bg-slate-900/50 p-4">
            <p className="text-sm leading-relaxed text-slate-400 italic">
              {clause.matched_complaint}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
