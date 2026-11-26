import React from "react";
import { ChevronLeft } from "lucide-react";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";
import type { ConnectionStatus } from "../transport/realtimeClient";

interface GuestHeaderProps {
  property?: PropertySettings | null;
  stay: VerifiedStaySession;
  connStatus: ConnectionStatus;
  showBackToHub?: boolean;
  onBackToHub?: () => void;
  rightActions?: React.ReactNode;
}

export function GuestHeader({
  property,
  stay,
  connStatus,
  showBackToHub,
  onBackToHub,
  rightActions,
}: GuestHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/14 bg-[#22231B]/84 backdrop-blur-md transform-gpu shadow-[0_8px_24px_-10px_rgba(0,0,0,0.45)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={property?.logoUrl || "/kusum-kunja-cafe-logo.png"}
            alt={`${property?.name || "Property"} logo`}
            className="w-8 h-8 shrink-0 rounded-full border border-white/25 bg-white p-0.5 object-contain shadow-xs"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-sans text-[15px] font-bold leading-tight tracking-tight text-white sm:text-[17px]">
                {property?.name || "Suite Concierge"}
              </span>
              <span className="hidden rounded-full frost-pill-chip px-2 py-0.5 text-[9px] font-semibold sm:inline-flex">
                In-Suite
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/70 tabular-nums">
              <span className="font-semibold text-white">Suite {stay.room?.roomNumber}</span>
              <span>·</span>
              <span className="truncate max-w-[120px]">{stay.guestName}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showBackToHub && onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex items-center gap-1 rounded-full frost-cta-white px-3 py-1 text-xs font-bold btn-smooth-press-sm"
            >
              <ChevronLeft size={14} /> Guide
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold frost-pill-chip">
            {connStatus === "connected" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]" />
                <span className="text-white">Live</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                <span className="text-amber-100">Syncing</span>
              </>
            )}
          </div>
          {rightActions}
        </div>
      </div>
    </header>
  );
}
