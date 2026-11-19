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
import { cn } from "../lib/utils";

interface Props {
  status: string;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending Reception",
    color: "bg-amber-500/10 text-amber-900 border-amber-500/30",
    icon: <Clock className="w-3 h-3 animate-pulse text-amber-600" />,
  },
  accepted: {
    label: "Accepted",
    color: "bg-indigo-500/10 text-indigo-900 border-indigo-500/30",
    icon: <Check className="w-3 h-3 text-indigo-600" />,
  },
  preparing: {
    label: "In Kitchen",
    color: "bg-blue-500/10 text-blue-900 border-blue-500/30",
    icon: <ChefHat className="w-3 h-3 text-blue-600" />,
  },
  ready: {
    label: "Plated & Ready",
    color: "bg-emerald-500/10 text-emerald-900 border-emerald-500/30",
    icon: <CheckCircle className="w-3 h-3 text-emerald-600" />,
  },
  out_for_delivery: {
    label: "En Route to Suite",
    color: "bg-purple-500/10 text-purple-900 border-purple-500/30",
    icon: <Truck className="w-3 h-3 text-purple-600" />,
  },
  delivered: {
    label: "Delivered",
    color: "bg-[#FAF3E6] text-[#8E6314] border-[#ECD7A9]",
    icon: <Utensils className="w-3 h-3 text-[#B88223]" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-rose-500/10 text-rose-900 border-rose-500/30",
    icon: <XCircle className="w-3 h-3 text-rose-600" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-stone-500/10 text-stone-700 border-stone-300",
    icon: <Ban className="w-3 h-3 text-stone-500" />,
  },
};

export function StatusBadge({ status, className, showIcon = true }: Props) {
  const norm = status.toLowerCase();
  const cfg = STATUS_CONFIG[norm] || {
    label: status,
    color: "bg-stone-100 text-stone-700 border-stone-200",
    icon: <Clock className="w-3 h-3" />,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs transition-colors whitespace-nowrap",
        cfg.color,
        className
      )}
    >
      {showIcon && cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}
