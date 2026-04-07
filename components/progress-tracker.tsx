"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { ANALYSIS_STAGES } from "@/hooks/use-analysis";

interface ProgressTrackerProps {
  currentStage: number;
  status: "pending" | "processing" | "complete" | "failed";
}

export function ProgressTracker({ currentStage, status }: ProgressTrackerProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-800" />

        {/* Progress line */}
        <motion.div
          className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"
          initial={{ width: 0 }}
          animate={{
            width:
              status === "complete"
                ? "calc(100% - 2.5rem)"
                : `calc(${((currentStage - 1) / (ANALYSIS_STAGES.length - 1)) * 100}% - ${
                    currentStage === 1 ? 0 : 0
                  }px)`,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Stages */}
        <div className="relative flex justify-between">
          {ANALYSIS_STAGES.map((stage, index) => {
            const isComplete =
              status === "complete" ||
              currentStage > stage.stage ||
              (currentStage === stage.stage && status === "complete");
            const isCurrent = currentStage === stage.stage && status !== "complete";
            const isPending = currentStage < stage.stage;

            return (
              <div key={stage.stage} className="flex flex-col items-center">
                {/* Stage circle */}
                <motion.div
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-300",
                    isComplete && "border-cyan-500 bg-cyan-500",
                    isCurrent && "border-cyan-500 bg-slate-950",
                    isPending && "border-slate-700 bg-slate-950"
                  )}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isComplete ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Check className="h-5 w-5 text-white" />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-5 w-5 text-cyan-500" />
                    </motion.div>
                  ) : (
                    <span className="text-sm font-medium text-slate-600">{stage.stage}</span>
                  )}
                </motion.div>

                {/* Stage name */}
                <motion.p
                  className={cn(
                    "mt-3 text-center text-xs font-medium max-w-[80px] leading-tight",
                    isComplete && "text-cyan-400",
                    isCurrent && "text-white",
                    isPending && "text-slate-600"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {stage.name}
                </motion.p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
