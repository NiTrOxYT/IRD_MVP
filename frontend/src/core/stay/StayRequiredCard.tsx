import React from "react";
import { AlertCircle, QrCode } from "lucide-react";
import type { PropertySettings } from "../property/propertyTypes";
import { ArchClocheIcon } from "../ui/EnterpriseIcons";

interface StayRequiredCardProps {
  property?: PropertySettings | null;
  fallbackLogo?: string | null;
  authError?: string | null;
}

export function StayRequiredCard({ property, fallbackLogo, authError }: StayRequiredCardProps) {
  const logoSrc = property?.logoUrl || fallbackLogo || "";

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F6F4EF] px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-[rgba(20,18,16,0.1)] bg-white p-7 text-center shadow-[0_12px_36px_-16px_rgba(20,18,16,0.12)] modal-3d-enter sm:p-8">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={`${property?.name || "Property"} emblem`}
            className="mx-auto mb-4 h-14 w-14 rounded-lg border border-[rgba(20,18,16,0.1)] bg-white p-1 object-contain"
          />
        ) : (
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[rgba(20,18,16,0.1)] bg-[#F6F4EF] text-[#141210]"
          >
            <ArchClocheIcon className="h-5 w-5" />
          </div>
        )}

        <h1 className="font-serif text-2xl font-semibold tracking-[-0.01em] text-[#141210]">
          {property?.name || "Suite Concierge"}
        </h1>
        <p className="mt-1 mb-6 text-xs text-[#5C554E]">
          Private in-room dining & hospitality directory
        </p>

        <div className="mb-5 flex items-start gap-3 rounded-lg border border-[rgba(20,18,16,0.09)] bg-[#F6F4EF] p-3.5 text-left">
          <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-[#966F29]" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed text-[#5C554E]">
            Scan the desk or bedside suite QR card to activate ordering for your stay.
          </p>
        </div>

        {authError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.5} />
            <span>{authError}</span>
          </div>
        )}

        <div className="border-t border-[rgba(20,18,16,0.08)] pt-4 text-xs text-[#5C554E]">
          Assistance available 24 hours · <span className="font-medium text-[#141210]">Extension 0</span>
        </div>
      </div>
    </div>
  );
}
