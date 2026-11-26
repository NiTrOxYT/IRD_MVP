import React from "react";
import { ChevronLeft } from "lucide-react";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";
import type { ConnectionStatus } from "../transport/realtimeClient";
import { cn } from "../ui/utils";

interface GuestHeaderProps {
  property?: PropertySettings | null;
  stay: VerifiedStaySession;
  connStatus: ConnectionStatus;
  showBackToHub?: boolean;
  onBackToHub?: () => void;
  rightActions?: React.ReactNode;
  appearance?: "dark" | "cream";
}

export function GuestHeader({
  property,
  stay,
  connStatus,
  showBackToHub,
  onBackToHub,
  rightActions,
  appearance = "dark",
}: GuestHeaderProps) {
  const isCream = appearance === "cream";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b",
        isCream
          ? "border-[#EAE0D4] bg-[#FAF3EA]/96 text-[#3D1C11] shadow-[0_6px_18px_-12px_rgba(64,28,12,0.16)]"
          : "border-white/12 bg-[#1A1B15]/96 text-white shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={property?.logoUrl || "/kusum-kunja-cafe-logo.png"}
            alt={`${property?.name || "Property"} logo`}
            className={cn(
              "w-8 h-8 shrink-0 rounded-full border p-0.5 object-contain shadow-2xs",
              isCream ? "border-[#E6D7C6] bg-white" : "border-white/25 bg-white"
            )}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate font-sans text-[15px] font-bold leading-tight tracking-tight sm:text-[17px]",
                  isCream ? "text-[#42180E]" : "text-white"
                )}
              >
                {property?.name || "Suite Concierge"}
              </span>
              <span
                className={cn(
                  "hidden rounded-full px-2 py-0.5 text-[9px] font-semibold sm:inline-flex",
                  isCream
                    ? "border border-[#E6D7C6] bg-[#FFFBF6] text-[#7B5F54]"
                    : "frost-pill-chip"
                )}
              >
                In-Suite
              </span>
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 text-[11px] tabular-nums",
                isCream ? "text-[#7B5F54]" : "text-white/70"
              )}
            >
              <span className={cn("font-semibold", isCream ? "text-[#3D1C11]" : "text-white")}>
                Suite {stay.room?.roomNumber}
              </span>
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
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold btn-smooth-press-sm",
                isCream
                  ? "border border-[#E5D7C6] bg-[#FFFBF6] text-[#3D1C11] hover:bg-[#F3E7DA]"
                  : "frost-cta-white"
              )}
            >
              <ChevronLeft size={14} /> Guide
            </button>
          )}
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold",
              isCream ? "border border-[#E5D7C6] bg-[#FFFBF6] text-[#5B4137]" : "frost-pill-chip"
            )}
          >
            {connStatus === "connected" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className={isCream ? "text-[#3D1C11]" : "text-white"}>Live</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className={isCream ? "text-[#7B5F54]" : "text-amber-100"}>Syncing</span>
              </>
            )}
          </div>
          {rightActions}
        </div>
      </div>
    </header>
  );
}
