import React from "react";

interface SuiteLoaderProps {
  logoUrl?: string | null;
  bgUrl?: string | null;
}

export function SuiteLoader({ logoUrl, bgUrl }: SuiteLoaderProps) {
  return (
    <div
      className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#302015] px-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <img
        src={bgUrl || "/suite-loader-scene.jpg"}
        alt=""
        aria-hidden="true"
        className="suite-loader-scene pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[58%_center]"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/suite-loader-scene.jpg";
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(30,19,12,0.42)_0%,rgba(33,21,14,0.34)_48%,rgba(30,18,11,0.52)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_49%,rgba(34,21,14,0.38)_0%,rgba(34,21,14,0.1)_48%,transparent_72%)]"
      />
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="suite-loader-mark relative mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border border-[#E2C98F] bg-[#FFFDF9] p-3 shadow-[0_8px_28px_rgba(20,12,8,0.38)]"
          aria-hidden="true"
        >
          <img src={logoUrl || "/kusum-kunja-cafe-logo.png"} alt="" className="h-full w-full object-contain" />
        </div>
        <h2 className="suite-loader-copy font-serif text-3xl font-semibold tracking-tight text-[#FFF9EF] sm:text-4xl">
          Preparing your suite
        </h2>
        <p className="suite-loader-copy mt-2 max-w-[90vw] font-script text-lg text-[#E9C77D]">
          Your stay is almost ready
        </p>
        <p className="suite-loader-copy mt-3 text-xs tracking-wide text-[#F3E9DB]">
          Connecting to your stay
        </p>
        <span className="suite-loader-trace mt-7 h-px w-36 overflow-hidden rounded-full bg-[#F3E9DB]/30" aria-hidden="true">
          <span className="block h-full w-1/2 rounded-full bg-[#E9C77D]" />
        </span>
      </div>
    </div>
  );
}
