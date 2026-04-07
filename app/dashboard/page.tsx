"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, X, Loader2, AlertCircle, BarChart3,
  FileSearch, Clock, User, ChevronDown, ChevronUp,
  TrendingUp, IndianRupee, CreditCard, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { getLoanStats, type LoanStats, ApiError, getAuthToken } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface FinancialProfile {
  age: string; income: string; loan_amount: string; emi_amount: string;
  tenure_months: string; credit_score: string; employment_type: string; loan_type: string;
}

const defaultProfile: FinancialProfile = {
  age: "", income: "", loan_amount: "", emi_amount: "",
  tenure_months: "", credit_score: "", employment_type: "", loan_type: "",
};

const employmentOptions = ["Salaried", "Self-Employed", "Business"];
const loanTypeOptions = ["Personal Loan", "Home Loan", "Car Loan", "Two-Wheeler Loan", "BNPL"];

const inputClass = "w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder-slate-500 transition-all duration-200 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 hover:border-white/20";
const selectClass = "w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white transition-all duration-200 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 hover:border-white/20 appearance-none cursor-pointer";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{children}</label>;
}

function EMIRatioBar({ income, emi }: { income: string; emi: string }) {
  const inc = parseFloat(income);
  const em = parseFloat(emi);
  if (!inc || !em || inc <= 0) return null;
  const ratio = Math.min((em / inc) * 100, 100);
  const color = ratio > 50 ? "from-red-500 to-red-600" : ratio > 35 ? "from-amber-500 to-amber-600" : "from-cyan-500 to-blue-500";
  const label = ratio > 50 ? "High stress" : ratio > 35 ? "Moderate" : "Healthy";
  const textColor = ratio > 50 ? "text-red-400" : ratio > 35 ? "text-amber-400" : "text-cyan-400";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg border border-white/5 bg-slate-900/40 p-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-slate-400">EMI-to-Income Ratio</span>
        <span className={`text-xs font-semibold ${textColor}`}>{ratio.toFixed(1)}% · {label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${ratio}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className={`h-full rounded-full bg-gradient-to-r ${color}`} />
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loanStats, setLoanStats] = useState<LoanStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [profile, setProfile] = useState<FinancialProfile>(defaultProfile);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [profileErrors, setProfileErrors] = useState<Partial<FinancialProfile>>({});

  useEffect(() => {
    getLoanStats().then(setLoanStats).catch((err) => {
      setStatsError(err instanceof ApiError ? err.message : "Failed to load statistics");
    }).finally(() => setStatsLoading(false));
  }, []);

  const updateField = (field: keyof FinancialProfile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setProfileErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validateProfile = (): boolean => {
    const errors: Partial<FinancialProfile> = {};
    if (!profile.age || parseInt(profile.age) < 18 || parseInt(profile.age) > 70) errors.age = "18–70";
    if (!profile.income || parseFloat(profile.income) <= 0) errors.income = "Required";
    if (!profile.loan_amount || parseFloat(profile.loan_amount) <= 0) errors.loan_amount = "Required";
    if (!profile.emi_amount || parseFloat(profile.emi_amount) <= 0) errors.emi_amount = "Required";
    if (!profile.tenure_months || parseInt(profile.tenure_months) <= 0) errors.tenure_months = "Required";
    if (!profile.credit_score || parseInt(profile.credit_score) < 300 || parseInt(profile.credit_score) > 900) errors.credit_score = "300–900";
    if (!profile.employment_type) errors.employment_type = "Required";
    if (!profile.loan_type) errors.loan_type = "Required";
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); setUploadError(null);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f); else setUploadError("Please upload a PDF file");
  }, []);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const f = e.target.files?.[0];
    if (f?.type === "application/pdf") setFile(f); else if (f) setUploadError("Please upload a PDF file");
  }, []);
  const handleRemoveFile = useCallback(() => { setFile(null); setUploadError(null); }, []);

  const handleUpload = async () => {
    if (!file) return;
    if (!validateProfile()) {
      setProfileExpanded(true);
      setUploadError("Please complete your financial profile before analyzing.");
      return;
    }
    setIsUploading(true); setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      Object.entries(profile).forEach(([k, v]) => formData.append(k, v));
      const headers: HeadersInit = {};
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/upload`, { method: "POST", headers, body: formData });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new ApiError(b.error || "Upload failed", res.status); }
      const { task_id } = await res.json();
      router.push(`/analysis/${task_id}`);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Failed to upload contract. Please try again.");
      setIsUploading(false);
    }
  };

  const profileComplete = Object.values(profile).every((v) => v !== "");

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-2 text-slate-400">Enter your financial profile and upload a contract for a personalized risk analysis</p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-5">

              {/* Financial Profile Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                <button onClick={() => setProfileExpanded((v) => !v)} className="w-full flex items-center justify-between p-6 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15">
                      <User style={{ width: 18, height: 18 }} className="text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-base font-semibold text-white">Financial Profile</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{profileComplete ? "Profile complete — personalized analysis ready" : "Required for personalized stress analysis"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {profileComplete && <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1">Complete</span>}
                    {profileExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {profileExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
                      <div className="px-6 pb-6 border-t border-white/5 pt-5 space-y-5">
                        {/* Personal row */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Personal</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                              <FieldLabel>Age</FieldLabel>
                              <input type="number" min={18} max={70} placeholder="28" value={profile.age} onChange={(e) => updateField("age", e.target.value)} className={`${inputClass} ${profileErrors.age ? "border-red-500/50" : ""}`} />
                              {profileErrors.age && <p className="mt-1 text-xs text-red-400">{profileErrors.age}</p>}
                            </div>
                            <div>
                              <FieldLabel>Credit Score</FieldLabel>
                              <input type="number" min={300} max={900} placeholder="720" value={profile.credit_score} onChange={(e) => updateField("credit_score", e.target.value)} className={`${inputClass} ${profileErrors.credit_score ? "border-red-500/50" : ""}`} />
                              {profileErrors.credit_score && <p className="mt-1 text-xs text-red-400">{profileErrors.credit_score}</p>}
                            </div>
                            <div>
                              <FieldLabel>Employment</FieldLabel>
                              <div className="relative">
                                <select value={profile.employment_type} onChange={(e) => updateField("employment_type", e.target.value)} className={`${selectClass} ${profileErrors.employment_type ? "border-red-500/50" : ""}`}>
                                  <option value="" disabled>Select</option>
                                  {employmentOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                              </div>
                            </div>
                            <div>
                              <FieldLabel>Loan Type</FieldLabel>
                              <div className="relative">
                                <select value={profile.loan_type} onChange={(e) => updateField("loan_type", e.target.value)} className={`${selectClass} ${profileErrors.loan_type ? "border-red-500/50" : ""}`}>
                                  <option value="" disabled>Select</option>
                                  {loanTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Financial row */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <IndianRupee className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Financials</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                              <FieldLabel>Monthly Income ₹</FieldLabel>
                              <input type="number" placeholder="50000" value={profile.income} onChange={(e) => updateField("income", e.target.value)} className={`${inputClass} ${profileErrors.income ? "border-red-500/50" : ""}`} />
                              {profileErrors.income && <p className="mt-1 text-xs text-red-400">{profileErrors.income}</p>}
                            </div>
                            <div>
                              <FieldLabel>Monthly EMI ₹</FieldLabel>
                              <input type="number" placeholder="15000" value={profile.emi_amount} onChange={(e) => updateField("emi_amount", e.target.value)} className={`${inputClass} ${profileErrors.emi_amount ? "border-red-500/50" : ""}`} />
                              {profileErrors.emi_amount && <p className="mt-1 text-xs text-red-400">{profileErrors.emi_amount}</p>}
                            </div>
                            <div>
                              <FieldLabel>Loan Amount ₹</FieldLabel>
                              <input type="number" placeholder="600000" value={profile.loan_amount} onChange={(e) => updateField("loan_amount", e.target.value)} className={`${inputClass} ${profileErrors.loan_amount ? "border-red-500/50" : ""}`} />
                              {profileErrors.loan_amount && <p className="mt-1 text-xs text-red-400">{profileErrors.loan_amount}</p>}
                            </div>
                            <div>
                              <FieldLabel>Tenure (months)</FieldLabel>
                              <input type="number" placeholder="36" value={profile.tenure_months} onChange={(e) => updateField("tenure_months", e.target.value)} className={`${inputClass} ${profileErrors.tenure_months ? "border-red-500/50" : ""}`} />
                              {profileErrors.tenure_months && <p className="mt-1 text-xs text-red-400">{profileErrors.tenure_months}</p>}
                            </div>
                          </div>
                          <EMIRatioBar income={profile.income} emi={profile.emi_amount} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Upload Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15">
                    <FileText style={{ width: 18, height: 18 }} className="text-cyan-400" />
                  </div>
                  <h2 className="text-base font-semibold text-white">Upload Contract</h2>
                </div>

                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${isDragging ? "border-cyan-500 bg-cyan-500/10" : file ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-700 hover:border-slate-600 bg-slate-900/30"}`}>
                  {file ? (
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20">
                            <FileText style={{ width: 22, height: 22 }} className="text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{file.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
                          </div>
                        </div>
                        <button onClick={handleRemoveFile} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-10 cursor-pointer">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 mb-4">
                        <Upload className="h-7 w-7 text-slate-400" />
                      </motion.div>
                      <p className="text-white font-medium mb-1">Drop your PDF here, or <span className="text-cyan-400">browse</span></p>
                      <p className="text-xs text-slate-500">PDF files only</p>
                      <input type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className="absolute inset-0 cursor-pointer opacity-0" />
                    </label>
                  )}
                </div>

                <AnimatePresence>
                  {uploadError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{uploadError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button onClick={handleUpload} disabled={!file || isUploading} className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 disabled:opacity-40 py-5 text-sm font-semibold tracking-wide transition-all duration-200">
                  {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><FileSearch className="mr-2 h-4 w-4" />Analyze Contract</>}
                </Button>
                {!profileComplete && file && <p className="mt-2 text-center text-xs text-amber-400/70">Complete your financial profile above for a personalized report</p>}
              </motion.div>

              {/* Past Analyses */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h2 className="text-base font-semibold text-white mb-4">Past Analyses</h2>
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/50 mb-3"><Clock className="h-7 w-7 text-slate-500" /></div>
                  <p className="text-white font-medium mb-1 text-sm">No analyses yet</p>
                  <p className="text-xs text-slate-500 max-w-xs">Upload your first contract above to get started</p>
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-5">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 style={{ width: 18, height: 18 }} className="text-cyan-400" />
                  <h2 className="text-base font-semibold text-white">Loan Statistics</h2>
                </div>
                {statsLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-cyan-400" /></div>
                  : statsError ? <div className="flex flex-col items-center justify-center py-8 text-center"><AlertCircle className="h-7 w-7 text-slate-500 mb-2" /><p className="text-xs text-slate-400">{statsError}</p></div>
                  : loanStats ? (
                    <div className="space-y-3">
                      {loanStats.total_loans !== undefined && <div className="rounded-xl bg-slate-900/50 p-4"><p className="text-xs text-slate-400 mb-1">Total Loans Analyzed</p><p className="text-2xl font-bold text-white">{loanStats.total_loans.toLocaleString()}</p></div>}
                      {loanStats.average_amount !== undefined && <div className="rounded-xl bg-slate-900/50 p-4"><p className="text-xs text-slate-400 mb-1">Average Loan Amount</p><p className="text-xl font-bold text-white">₹{loanStats.average_amount.toLocaleString()}</p></div>}
                      <div className="grid grid-cols-3 gap-2">
                        {loanStats.high_risk_count !== undefined && <div className="rounded-xl bg-red-500/10 border border-red-500/10 p-3 text-center"><p className="text-xs text-red-400 mb-1">High</p><p className="text-lg font-bold text-red-400">{loanStats.high_risk_count}</p></div>}
                        {loanStats.medium_risk_count !== undefined && <div className="rounded-xl bg-amber-500/10 border border-amber-500/10 p-3 text-center"><p className="text-xs text-amber-400 mb-1">Med</p><p className="text-lg font-bold text-amber-400">{loanStats.medium_risk_count}</p></div>}
                        {loanStats.low_risk_count !== undefined && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/10 p-3 text-center"><p className="text-xs text-emerald-400 mb-1">Low</p><p className="text-lg font-bold text-emerald-400">{loanStats.low_risk_count}</p></div>}
                      </div>
                    </div>
                  ) : <p className="text-xs text-slate-400 text-center py-8">No statistics available</p>}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp style={{ width: 18, height: 18 }} className="text-cyan-400" />
                  <h2 className="text-base font-semibold text-white">What We Analyze</h2>
                </div>
                <ul className="space-y-2.5">
                  {[
                    { icon: CreditCard, text: "Predatory interest clauses" },
                    { icon: AlertCircle, text: "Forced arbitration terms" },
                    { icon: Briefcase, text: "Cross-collateralization" },
                    { icon: TrendingUp, text: "Compound penal interest" },
                    { icon: FileText, text: "Hidden fee structures" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2.5 text-xs text-slate-400">
                      <Icon className="h-3.5 w-3.5 text-cyan-500/60 flex-shrink-0" />{text}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
