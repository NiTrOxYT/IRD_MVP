import React from "react";
import {
  Clock,
  Check,
  ChefHat,
  CheckCircle,
  Truck,
  Utensils,
  XCircle,
  Ban,
} from "lucide-react";
import { cn } from "./utils";

interface Props {
  status: string;
  className?: string;
  showIcon?: boolean;
  variant?: "light" | "glass";
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; glassColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending Reception",
    color: "bg-amber-500/10 text-amber-900 border-amber-500/30",
    glassColor: "bg-amber-400/20 text-amber-100 border-amber-300/35",
    icon: <Clock className="w-3 h-3 animate-pulse text-amber-400" />,
  },
  accepted: {
    label: "Accepted",
    color: "bg-indigo-500/10 text-indigo-900 border-indigo-500/30",
    glassColor: "bg-indigo-400/20 text-indigo-100 border-indigo-300/35",
    icon: <Check className="w-3 h-3 text-indigo-400" />,
  },
  preparing: {
    label: "In Kitchen",
    color: "bg-blue-500/10 text-blue-900 border-blue-500/30",
    glassColor: "bg-sky-400/20 text-sky-100 border-sky-300/35",
    icon: <ChefHat className="w-3 h-3 text-sky-400" />,
  },
  ready: {
    label: "Plated & Ready",
    color: "bg-emerald-500/10 text-emerald-900 border-emerald-500/30",
    glassColor: "bg-emerald-400/20 text-emerald-100 border-emerald-300/35",
    icon: <CheckCircle className="w-3 h-3 text-emerald-400" />,
  },
  out_for_delivery: {
    label: "En Route to Suite",
    color: "bg-purple-500/10 text-purple-900 border-purple-500/30",
    glassColor: "bg-purple-400/20 text-purple-100 border-purple-300/35",
    icon: <Truck className="w-3 h-3 text-purple-300" />,
  },
  delivered: {
    label: "Delivered",
    color: "bg-[#FAF3E6] text-[#8E6314] border-[#ECD7A9]",
    glassColor: "bg-white/18 text-white border-white/30",
    icon: <Utensils className="w-3 h-3 text-white/90" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-rose-500/10 text-rose-900 border-rose-500/30",
    glassColor: "bg-rose-500/22 text-rose-100 border-rose-300/35",
    icon: <XCircle className="w-3 h-3 text-rose-300" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-stone-500/10 text-stone-700 border-stone-300",
    glassColor: "bg-white/12 text-white/75 border-white/20",
    icon: <Ban className="w-3 h-3 text-white/70" />,
  },
};

export function StatusBadge({ status, className, showIcon = true, variant = "light" }: Props) {
  const norm = status.toLowerCase();
  const cfg = STATUS_CONFIG[norm] || {
    label: status,
    color: "bg-stone-100 text-stone-700 border-stone-200",
    glassColor: "bg-white/14 text-white border-white/25",
    icon: <Clock className="w-3 h-3" />,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs transition-colors whitespace-nowrap",
        variant === "glass" ? cfg.glassColor : cfg.color,
        className
      )}
    >
      {showIcon && cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}
