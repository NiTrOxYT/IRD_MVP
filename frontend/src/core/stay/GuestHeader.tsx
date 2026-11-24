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
    <header className="sticky top-0 z-30 border-b border-[rgba(20,18,16,0.09)] bg-[#F6F4EF]/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={property?.logoUrl || "/kusum-kunja-cafe-logo.png"}
            alt={`${property?.name || "Property"} emblem`}
            className="h-8 w-8 shrink-0 rounded-md border border-[rgba(20,18,16,0.12)] bg-white p-0.5 object-contain"
          />
          <div className="min-w-0">
            <span className="block truncate font-serif text-[18px] font-semibold leading-none tracking-[-0.01em] text-[#141210] sm:text-[20px]">
              {property?.name || "Resort Concierge"}
            </span>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#5C554E]">
              <span className="font-medium text-[#141210] tabular-nums">
                Suite {stay.room?.roomNumber}
              </span>
              {stay.guestName && (
                <>
                  <span className="h-2.5 w-px bg-[rgba(20,18,16,0.16)]" aria-hidden="true" />
                  <span className="truncate max-w-[130px]">{stay.guestName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showBackToHub && onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[rgba(20,18,16,0.12)] bg-white px-2.5 text-xs font-medium text-[#141210] transition-colors hover:border-[rgba(20,18,16,0.26)] btn-smooth-press-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-[#5C554E]" strokeWidth={1.5} />
              <span>Services</span>
            </button>
          )}
          <span
            className="hidden items-center gap-1.5 rounded-lg border border-[rgba(20,18,16,0.09)] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5C554E] sm:inline-flex"
            title={connStatus === "connected" ? "Realtime connection active" : "Reconnecting"}
          >
            {connStatus === "connected" ? "Connected" : "Syncing"}
          </span>
          {rightActions}
        </div>
      </div>
    </header>
  );
}
