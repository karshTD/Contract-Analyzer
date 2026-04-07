"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/navbar";
import { ProgressTracker } from "@/components/progress-tracker";
import { ClauseCard } from "@/components/clause-card";
import { RiskReport } from "@/components/risk-report";
import { RiskBadge } from "@/components/risk-badge";
import { useAnalysis } from "@/hooks/use-analysis";

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default function AnalysisPage({ params }: PageProps) {
  const { taskId } = use(params);
  const { status, isLoading, error, refetch } = useAnalysis(taskId);

  const isComplete = status?.status === "complete";
  const isFailed = status?.status === "failed";
  const currentStage = status?.stage || 1;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Contract Analysis</h1>
                <p className="mt-2 text-slate-400">
                  {isComplete
                    ? "Analysis complete"
                    : isFailed
                    ? "Analysis failed"
                    : "Analyzing your contract..."}
                </p>
              </div>
              {isComplete && status?.risk_level && (
                <RiskBadge level={status.risk_level} size="lg" />
              )}
            </div>
          </motion.div>

          {/* Error state */}
          {(error || isFailed) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Analysis Failed
              </h2>
              <p className="text-slate-400 mb-6">
                {error || "Something went wrong while analyzing your contract."}
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={refetch}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Progress tracker - show when not complete and not failed */}
          {!isComplete && !isFailed && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
            >
              <div className="text-center mb-8">
                <h2 className="text-lg font-semibold text-white">
                  {status?.stage_name || "Starting analysis..."}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Stage {currentStage} of 6
                </p>
              </div>
              <ProgressTracker
                currentStage={currentStage}
                status={status?.status || "pending"}
              />
            </motion.div>
          )}

          {/* Results - show when complete */}
          {isComplete && status && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Tabs defaultValue="clauses" className="w-full">
                <TabsList className="w-full justify-start bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
                  <TabsTrigger
                    value="clauses"
                    className="rounded-lg px-6 py-2.5 text-sm font-medium data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-400 hover:text-white transition-colors"
                  >
                    Flagged Clauses
                    {status.flagged_clauses.length > 0 && (
                      <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                        {status.flagged_clauses.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="report"
                    className="rounded-lg px-6 py-2.5 text-sm font-medium data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-400 hover:text-white transition-colors"
                  >
                    Risk Report
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="clauses" className="mt-0">
                  {status.flagged_clauses.length > 0 ? (
                    <div className="space-y-4">
                      {status.flagged_clauses.map((clause, index) => (
                        <ClauseCard
                          key={index}
                          clause={clause}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                          <svg
                            className="h-8 w-8 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No Risky Clauses Found
                      </h3>
                      <p className="text-slate-400">
                        Great news! We didn&apos;t find any clauses matching known
                        complaint patterns.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="report" className="mt-0">
                  <RiskReport
                    data={status.risk_report_structured}
                    fallbackText={status.risk_report || "No risk report available."}
                    riskLevel={status.risk_level}
                  />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {/* Loading indicator */}
          {isLoading && !status && (
            <div className="flex justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                <p className="text-slate-400">Loading analysis...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
