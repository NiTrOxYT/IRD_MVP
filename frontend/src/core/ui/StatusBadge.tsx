import React from "react";
import { cn } from "./utils";

interface Props {
  status: string;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-50/90 text-amber-900 border-amber-300/80",
    dot: "bg-amber-600",
  },
  accepted: {
    label: "Confirmed",
    color: "bg-sky-50/90 text-sky-900 border-sky-300/80",
    dot: "bg-sky-600",
  },
  preparing: {
    label: "In Kitchen",
    color: "bg-indigo-50/90 text-indigo-900 border-indigo-300/80",
    dot: "bg-indigo-600",
  },
  ready: {
    label: "Ready",
    color: "bg-emerald-50/90 text-emerald-900 border-emerald-300/80",
    dot: "bg-emerald-600",
  },
  out_for_delivery: {
    label: "En Route",
    color: "bg-violet-50/90 text-violet-900 border-violet-300/80",
    dot: "bg-violet-600",
  },
  delivered: {
    label: "Delivered",
    color: "bg-[#F7F2E7] text-[#7A591C] border-[#D9C7A3]",
    dot: "bg-[#966F29]",
  },
  rejected: {
    label: "Declined",
    color: "bg-rose-50/90 text-rose-900 border-rose-300/80",
    dot: "bg-rose-600",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-stone-100 text-stone-700 border-stone-300/80",
    dot: "bg-stone-500",
  },
};

export function StatusBadge({ status, className, showIcon = true }: Props) {
  const norm = status.toLowerCase();
  const cfg = STATUS_CONFIG[norm] || {
    label: status,
    color: "bg-stone-100 text-stone-700 border-stone-200",
    dot: "bg-stone-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors",
        cfg.color,
        className
      )}
    >
      {showIcon && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} aria-hidden="true" />}
      <span>{cfg.label}</span>
    </span>
  );
}
