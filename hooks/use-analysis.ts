"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAnalysisStatus, type AnalysisStatus, ApiError } from "@/lib/api";

interface UseAnalysisReturn {
  status: AnalysisStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const ANALYSIS_STAGES = [
  { stage: 1, name: "Uploading Document" },
  { stage: 2, name: "Extracting Text" },
  { stage: 3, name: "Analyzing Clauses" },
  { stage: 4, name: "Matching Complaints" },
  { stage: 5, name: "Generating Risk Report" },
  { stage: 6, name: "Finalizing Analysis" },
] as const;

export function useAnalysis(taskId: string | null): UseAnalysisReturn {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const data = await getAnalysisStatus(taskId);
      setStatus(data);
      setError(null);

      // Stop polling if analysis is complete or failed
      if (data.status === "complete" || data.status === "failed") {
        stopPolling();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch analysis status");
      }
      stopPolling();
    }
  }, [taskId, stopPolling]);

  const startPolling = useCallback(() => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    // Initial fetch
    fetchStatus();

    // Poll every 2.5 seconds
    intervalRef.current = setInterval(fetchStatus, 2500);
  }, [taskId, fetchStatus]);

  const refetch = useCallback(() => {
    stopPolling();
    startPolling();
  }, [stopPolling, startPolling]);

  useEffect(() => {
    if (taskId) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [taskId, startPolling, stopPolling]);

  // Update loading state based on status
  useEffect(() => {
    if (status?.status === "complete" || status?.status === "failed" || error) {
      setIsLoading(false);
    }
  }, [status, error]);

  return {
    status,
    isLoading,
    error,
    refetch,
  };
}
