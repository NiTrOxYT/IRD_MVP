import React from "react";
import { ArrowRight } from "lucide-react";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";

export const DEFAULT_WELCOME_MESSAGE =
  "It is our privilege to welcome you. Every detail of your suite has been thoughtfully prepared for quiet comfort and unhurried rest.\n\nWhether you wish to savour freshly plated in-room dining or arrange suite care at any hour, our hospitality team is delighted to look after you throughout your stay.";

interface GuestWelcomeLetterProps {
  stay: VerifiedStaySession;
  property?: PropertySettings | null;
  fallbackLogo?: string | null;
  onContinue: () => void;
}

function formatWelcomeBody(rawMessage: string | null | undefined, guestName: string): string {
  const base = rawMessage?.trim() || DEFAULT_WELCOME_MESSAGE;
  return base.replace(/\{\{\s*guest_?name\s*\}\}|\{\s*guest_?name\s*\}/gi, guestName);
}

export function GuestWelcomeLetter({
  stay,
  property,
  fallbackLogo,
  onContinue,
}: GuestWelcomeLetterProps) {
  const propertyName = property?.name?.trim() || "Resort Residence";
  const logoSrc = property?.logoUrl || fallbackLogo || "/kusum-kunja-cafe-logo.png";
  const bgSrc = property?.welcomeBgUrl || "/suite-welcome-card.jpg";
  const guestName = stay.guestName?.trim() || "Guest";
  const letterBody = formatWelcomeBody(property?.welcomeMessage, guestName);

  return (
    <main className="relative isolate flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#141210] px-4 py-8 sm:px-6 sm:py-12 screen-stage-fade">
      <img
        src={bgSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center suite-loader-scene opacity-85"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/suite-welcome-card.jpg";
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(20,18,16,0.48)_0%,rgba(20,18,16,0.38)_50%,rgba(20,18,16,0.72)_100%)]"
      />

      {/* Architectural Linen Stationery Card */}
      <article className="relative z-10 w-full max-w-lg rounded-xl border border-[rgba(20,18,16,0.14)] bg-[#FFFFFF]/96 px-6 py-7 text-[#141210] shadow-[0_28px_64px_-16px_rgba(12,10,8,0.45)] backdrop-blur-md sm:px-10 sm:py-9 modal-3d-enter">
        <header className="flex items-center justify-between gap-4 border-b border-[rgba(20,18,16,0.09)] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoSrc}
              alt={`${propertyName} emblem`}
              className="h-10 w-10 shrink-0 rounded-lg border border-[rgba(20,18,16,0.1)] bg-white p-1 object-contain"
            />
            <div className="min-w-0">
              <h1 className="truncate font-serif text-xl font-semibold tracking-[-0.01em] text-[#141210]">
                {propertyName}
              </h1>
              <p className="text-xs text-[#5C554E] tabular-nums">Suite {stay.room?.roomNumber}</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 py-6">
          <h2 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#141210]">
            Dear {guestName},
          </h2>

          <div className="max-w-[62ch] whitespace-pre-line font-sans text-[14px] leading-[1.7] text-[#3A342F] sm:text-[15px]">
            {letterBody}
          </div>

          <p className="pt-2 font-serif text-lg italic text-[#966F29]">
            Warm regards, {propertyName}
          </p>
        </section>

        <footer className="border-t border-[rgba(20,18,16,0.09)] pt-5">
          <button
            type="button"
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#141210] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2B2622] btn-smooth-press"
          >
            <span>Enter Suite Directory</span>
            <ArrowRight className="h-4 w-4 text-[#D9C7A3]" strokeWidth={1.5} />
          </button>
        </footer>
      </article>
    </main>
  );
}
