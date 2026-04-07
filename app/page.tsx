"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Shield, Search, FileText, AlertTriangle, ArrowRight, Sparkles, TrendingUp, Users, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

const features = [
  {
    icon: Search,
    title: "Clause Detection",
    description: "AI scans every clause in your loan contract to identify potentially harmful terms matched against 50,000 real consumer complaints.",
    accent: "cyan",
  },
  {
    icon: TrendingUp,
    title: "Personal Stress Analysis",
    description: "Enter your income, EMI, and credit score. Our ML model predicts your financial stress level and explains exactly how risky this contract is for you specifically.",
    accent: "blue",
    highlight: true,
  },
  {
    icon: AlertTriangle,
    title: "Risk Scoring",
    description: "Each flagged clause is scored based on semantic similarity to known complaints — evidence-based, not guesswork.",
    accent: "cyan",
  },
  {
    icon: FileText,
    title: "Plain-English Report",
    description: "Get a comprehensive risk report written in simple language, personalized to your financial situation.",
    accent: "blue",
  },
];

const stats = [
  { value: "50K+", label: "Consumer complaints analyzed", icon: Database },
  { value: "97%", label: "ML model accuracy", icon: TrendingUp },
  { value: "8–15s", label: "Full analysis time", icon: Sparkles },
  { value: "4", label: "Loan types supported", icon: Users },
];

const stagger = { animate: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } } };

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-44 md:pb-36">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/8 via-transparent to-transparent" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 h-[300px] w-[400px] bg-blue-600/8 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div className="mx-auto max-w-3xl text-center" initial="initial" animate="animate" variants={stagger}>
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/8 px-4 py-1.5 text-sm font-medium text-cyan-400">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Contract Analysis for Indian Loans
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl leading-tight">
              Protect Yourself from{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Hidden Loan Risks
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-slate-400 sm:text-xl leading-relaxed max-w-2xl mx-auto">
              Upload your loan contract, enter your financial details, and get a personalized risk report — powered by 50,000 real consumer complaints and an ML stress predictor.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="group bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 px-8 py-6 text-base font-semibold shadow-lg shadow-cyan-500/20 transition-all duration-300">
                  Analyze Your Contract
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-8 py-6 text-base border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-600 transition-all duration-200">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto"
          >
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/4 p-4 text-center backdrop-blur-sm">
                <div className="flex justify-center mb-2">
                  <Icon className="h-4 w-4 text-cyan-500/60" />
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Four layers of protection, personalized to your financial situation
            </p>
          </motion.div>

          <motion.div
            className="grid gap-5 md:grid-cols-2"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className={`group relative overflow-hidden rounded-2xl border p-8 backdrop-blur-sm transition-all duration-300 ${
                  feature.highlight
                    ? "border-cyan-500/30 bg-gradient-to-br from-cyan-500/8 to-blue-600/5 hover:border-cyan-500/50"
                    : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/[0.06]"
                }`}
              >
                {feature.highlight && (
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1">New</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/15 text-cyan-400">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">{index + 1}</span>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Comparison strip */}
      <section className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/3 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Why Not Just Use ChatGPT?</h2>
            <p className="mt-3 text-slate-400 text-sm max-w-lg mx-auto">Generic LLMs tell you a clause looks risky. We tell you it matches real complaints where borrowers were actually harmed.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              { label: "Generic LLM", items: ["No complaint grounding", "No stress prediction", "Same report for everyone", "No Indian loan focus"], bad: true },
              { label: "Contract Analyzer", items: ["50K real complaint matches", "Personalized ML stress score", "Tailored to your income & EMI", "Built for Indian loan types"], bad: false, highlight: true },
              { label: "A Lawyer", items: ["Very expensive", "Days to get a report", "No ML pattern detection", "Not available at 2am"], bad: true },
            ].map(({ label, items, bad, highlight }) => (
              <div key={label} className={`rounded-2xl border p-6 ${highlight ? "border-cyan-500/30 bg-gradient-to-br from-cyan-500/8 to-blue-600/5" : "border-white/8 bg-white/3"}`}>
                <p className={`font-semibold mb-4 text-sm ${highlight ? "text-cyan-400" : "text-slate-400"}`}>{label}</p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs">
                      <span className={`flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-xs font-bold ${bad ? "bg-red-500/15 text-red-400" : "bg-cyan-500/20 text-cyan-400"}`}>
                        {bad ? "×" : "✓"}
                      </span>
                      <span className={bad ? "text-slate-500" : "text-slate-300"}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to Analyze Your Contract?</h2>
            <p className="mt-4 text-slate-400">Upload your PDF, enter your financial details, and get a personalized risk report in under 15 seconds.</p>
            <Link href="/dashboard" className="mt-8 inline-block">
              <Button size="lg" className="group bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 px-8 py-6 text-base font-semibold shadow-lg shadow-cyan-500/20 transition-all duration-300">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-400">Contract<span className="text-cyan-400">Analyzer</span></span>
            </div>
            <p className="text-xs text-slate-600">Built for Indian borrowers · Powered by CFPB complaints + RandomForest ML</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
