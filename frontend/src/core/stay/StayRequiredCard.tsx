import React, { useRef } from "react";
import { AlertCircle, QrCode } from "lucide-react";
import { SilverClocheTrayIcon } from "../ui/CustomResortIcons";
import { gsap, useGSAP } from "../ui/gsap";
import type { PropertySettings } from "../property/propertyTypes";

interface StayRequiredCardProps {
  property?: PropertySettings | null;
  fallbackName?: string | null;
  fallbackLogo?: string | null;
  fallbackBgUrl?: string | null;
  authError?: string | null;
}

export function StayRequiredCard({
  property,
  fallbackName,
  fallbackLogo,
  fallbackBgUrl,
  authError,
}: StayRequiredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoSrc = property?.logoUrl || fallbackLogo || "";
  const bgSrc = property?.suiteLoaderBgUrl || fallbackBgUrl || "/suite-loader-scene.jpg";
  const propertyTitle = property?.name?.trim() || fallbackName?.trim() || "Suite Portal";

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".gsap-stay-req-item",
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.06,
            ease: "power3.out",
            force3D: true,
            clearProps: "transform",
          }
        );
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-x-clip bg-[#1E130C] px-5 py-10 text-[#FFF9EF]"
    >
      {/* Suite backdrop scene harmonizing with SuiteLoader & GuestServiceHub */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src={bgSrc}
          alt=""
          className="h-full w-full scale-[1.03] object-cover object-[58%_center] brightness-[0.68]"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.fallbackApplied) {
              img.dataset.fallbackApplied = "1";
              img.src = "/suite-loader-scene.jpg";
            }
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,14,9,0.58)_0%,rgba(24,14,9,0.46)_45%,rgba(16,9,6,0.9)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,rgba(24,14,9,0.18)_0%,rgba(16,9,6,0.72)_76%)]" />
      </div>

      {/* Single grounded dark-amber concierge surface */}
      <main className="relative z-10 w-full max-w-[400px] rounded-[24px] border border-[#E2C98F]/24 bg-[#19100B]/84 px-6 py-8 shadow-[0_24px_60px_-14px_rgba(8,4,2,0.82)] backdrop-blur-md sm:px-8 sm:py-9">
        <div className="text-center">
          {logoSrc ? (
            <div className="gsap-stay-req-item mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-[20px] border border-[#E2C98F]/55 bg-[#FFFDF9] p-1.5 shadow-[0_10px_24px_rgba(12,6,3,0.45)]">
              <img
                src={logoSrc}
                alt={`${propertyTitle} crest`}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="gsap-stay-req-item mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-[#E2C98F]/45 bg-[#2A1A11] text-[#E9C77D] shadow-[0_10px_24px_rgba(12,6,3,0.45)]"
            >
              <SilverClocheTrayIcon className="h-8 w-8" />
            </div>
          )}

          <h1 className="gsap-stay-req-item font-serif text-[28px] sm:text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#FFF9EF] [overflow-wrap:break-word]">
            {propertyTitle}
          </h1>

          <p
            className="gsap-stay-req-item mt-2 text-[19px] sm:text-[21px] font-medium italic leading-snug text-[#E9C77D]"
            style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
          >
            Dining, suite care &amp; concierge at your bedside
          </p>
        </div>

        {/* Direct scan guidance — clean hairline dividers, no nested card box */}
        <div className="gsap-stay-req-item mt-7 border-y border-[#E2C98F]/18 py-5">
          <div className="flex items-start gap-3.5 text-left">
            <div
              aria-hidden="true"
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E9C77D]/14 text-[#E9C77D]"
            >
              <QrCode className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-[14px] font-semibold text-[#FFF9EF]">
                Scan your suite QR code
              </h2>
              <p className="text-[13px] leading-relaxed text-[#EADDCB]/82">
                Found on your bedside table or desk. Your personal stay portal activates right after check-in.
              </p>
            </div>
          </div>
        </div>

        {authError && (
          <div
            role="alert"
            className="gsap-stay-req-item mt-5 flex items-start gap-2.5 rounded-xl border border-[#E9C77D]/32 bg-[#4A2512]/70 px-3.5 py-3 text-left text-[12.5px] leading-relaxed text-[#FFEAD1]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F2B749]" />
            <span>{authError}</span>
          </div>
        )}

        <footer className="gsap-stay-req-item mt-6 text-center text-[12.5px] text-[#EADDCB]/78">
          <p>
            Need help connecting? Dial <strong className="font-semibold text-[#FFF9EF]">Extension 0</strong> from your suite phone for Reception.
          </p>
        </footer>
      </main>
    </div>
  );
}
