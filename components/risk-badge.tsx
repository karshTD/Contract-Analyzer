"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

interface RiskBadgeProps {
  level: "HIGH" | "MEDIUM" | "LOW";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  animate?: boolean;
}

const riskConfig = {
  HIGH: {
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    text: "text-red-500",
    icon: AlertTriangle,
    label: "High Risk",
  },
  MEDIUM: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    text: "text-amber-500",
    icon: AlertCircle,
    label: "Medium Risk",
  },
  LOW: {
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    text: "text-green-500",
    icon: CheckCircle,
    label: "Low Risk",
  },
};

const sizeConfig = {
  sm: {
    padding: "px-2 py-0.5",
    text: "text-xs",
    icon: "h-3 w-3",
    gap: "gap-1",
  },
  md: {
    padding: "px-3 py-1",
    text: "text-sm",
    icon: "h-4 w-4",
    gap: "gap-1.5",
  },
  lg: {
    padding: "px-4 py-2",
    text: "text-base",
    icon: "h-5 w-5",
    gap: "gap-2",
  },
};

export function RiskBadge({
  level,
  size = "md",
  showIcon = true,
  animate = true,
}: RiskBadgeProps) {
  const risk = riskConfig[level];
  const sizeStyles = sizeConfig[size];
  const Icon = risk.icon;

  const content = (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        risk.bg,
        risk.border,
        risk.text,
        sizeStyles.padding,
        sizeStyles.text,
        sizeStyles.gap
      )}
    >
      {showIcon && <Icon className={sizeStyles.icon} />}
      <span>{risk.label}</span>
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {content}
    </motion.div>
  );
}
