import React from "react";

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  switch (status.toLowerCase()) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Pending Reception
        </span>
      );
    case "accepted":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          Order Accepted
        </span>
      );
    case "preparing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-300">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          In Kitchen
        </span>
      );
    case "ready":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          Ready for Plating
        </span>
      );
    case "out_for_delivery":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
          <span>🛎️</span> En Route to Room
        </span>
      );
    case "delivered":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-300">
          <span>✓</span> Delivered
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
          <span>✕</span> Rejected
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
          {status}
        </span>
      );
  }
}
