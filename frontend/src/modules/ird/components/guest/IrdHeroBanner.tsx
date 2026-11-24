import React from "react";
import { AlertCircle, ArrowRight, Clock } from "lucide-react";
import type { IrdPropertyConfig } from "../../types";

interface IrdHeroBannerProps {
  property?: IrdPropertyConfig | null;
  onExploreClick?: () => void;
}

export function IrdHeroBanner({ property, onExploreClick }: IrdHeroBannerProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[rgba(20,18,16,0.1)] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.03)]">
      <div className="grid grid-cols-1 sm:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-between gap-4 p-5 sm:p-7">
          <div className="space-y-2.5">
            <h1 className="font-serif text-[30px] font-semibold leading-[1.06] tracking-[-0.02em] text-[#141210] sm:text-[38px]">
              In-Room Dining
            </h1>
            <p className="max-w-[40ch] text-[13px] leading-relaxed text-[#5C554E]">
              Prepared to order in our kitchen and served directly to your suite.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={
                onExploreClick ||
                (() => document.getElementById("ird-menu-items")?.scrollIntoView({ behavior: "smooth" }))
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#141210] px-4 text-xs font-medium text-white transition-colors hover:bg-[#2B2622] btn-smooth-press"
            >
              <span>Browse Menu</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#D9C7A3]" strokeWidth={1.5} />
            </button>

            {property?.openingTime?.trim() && property?.closingTime?.trim() && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#5C554E] tabular-nums">
                <Clock className="h-3.5 w-3.5 text-[#966F29]" strokeWidth={1.5} />
                <span>
                  {property.openingTime} – {property.closingTime}
                </span>
              </span>
            )}
          </div>

          {property && !property.irdEnabled && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" strokeWidth={1.5} />
              <span>Ordering is currently paused by front desk.</span>
            </div>
          )}
        </div>

        <div className="relative aspect-[16/10] w-full overflow-hidden border-t border-[rgba(20,18,16,0.08)] bg-[#EFECE5] sm:aspect-auto sm:min-h-[210px] sm:border-l sm:border-t-0">
          <img
            src="/banner.png"
            alt="Suite culinary service"
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/hero-cafe-banner.jpg";
            }}
          />
        </div>
      </div>
    </section>
  );
}
