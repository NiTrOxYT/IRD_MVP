import React from "react";

interface SuiteLoaderProps {
  logoUrl?: string | null;
}

export function SuiteLoader({ logoUrl }: SuiteLoaderProps) {
  return (
    <div
      className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#141210] px-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <img
        src="/suite-loader-scene.jpg"
        alt=""
        aria-hidden="true"
        className="suite-loader-scene pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center opacity-75"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(20,18,16,0.52)_0%,rgba(20,18,16,0.42)_48%,rgba(20,18,16,0.68)_100%)]"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="suite-loader-mark relative mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white p-2.5 shadow-xl"
          aria-hidden="true"
        >
          <img
            src={logoUrl || "/kusum-kunja-cafe-logo.png"}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
        <h2 className="suite-loader-copy font-serif text-3xl font-semibold tracking-[-0.01em] text-[#FAF8F5] sm:text-4xl">
          Preparing your suite
        </h2>
        <p className="suite-loader-copy mt-2 text-xs font-normal text-[#DCD4C8]">
          Verifying suite session & hospitality services
        </p>
        <span
          className="suite-loader-trace mt-6 h-px w-32 overflow-hidden bg-white/20"
          aria-hidden="true"
        >
          <span className="block h-full w-1/2 bg-[#D9C7A3]" />
        </span>
      </div>
    </div>
  );
}
