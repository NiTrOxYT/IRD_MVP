import React from "react";
import { AlertCircle, QrCode } from "lucide-react";
import { SilverClocheTrayIcon } from "../ui/CustomResortIcons";
import type { PropertySettings } from "../property/propertyTypes";

interface StayRequiredCardProps {
  property?: PropertySettings | null;
  fallbackLogo?: string | null;
  authError?: string | null;
}

export function StayRequiredCard({ property, fallbackLogo, authError }: StayRequiredCardProps) {
  const logoSrc = property?.logoUrl || fallbackLogo || "";

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 sm:p-8 shadow-xl text-center modal-3d-enter">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={`${property?.name || "Property"} logo`}
            className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-[#ECD7A9] bg-[#FFFDF9] p-1 object-contain shadow-xs"
          />
        ) : (
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ECD7A9] bg-[#FFFDF9] text-[#A88C5B] shadow-xs"
          >
            <SilverClocheTrayIcon className="h-8 w-8" />
          </div>
        )}

        <h1 className="font-serif text-2xl font-bold text-[#1E150F] mb-1">In-Room Dining</h1>
        <p className="font-script text-base text-[#73685C] mb-6">
          Curated culinary experiences delivered to your suite
        </p>

        <div className="mb-6 rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] p-4 text-left flex items-start gap-3">
          <QrCode className="w-5 h-5 text-[#B88223] shrink-0 mt-0.5" />
          <p className="text-xs text-[#73685C] leading-relaxed">
            Please scan the permanent QR code placed on your suite desk or bedside table. Ordering is activated upon guest check-in.
          </p>
        </div>

        {authError && (
          <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-[#E5DDD1] text-[11px] text-[#73685C]">
          Need assistance? Dial <span className="font-bold text-[#1E150F]">Extension 0</span> from your in-suite phone for Reception.
        </div>
      </div>
    </div>
  );
}
