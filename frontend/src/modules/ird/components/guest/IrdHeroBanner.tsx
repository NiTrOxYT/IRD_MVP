import React, { useRef } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { gsap, smoothScrollToTarget, useGSAP } from "../../../../core/ui/gsap";
import type { IrdPropertyConfig } from "../../types";

interface IrdHeroBannerProps {
  property?: IrdPropertyConfig | null;
  onExploreClick?: () => void;
}

export function IrdHeroBanner({ property, onExploreClick }: IrdHeroBannerProps) {
  const bannerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = bannerRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.34, ease: "power2.out", force3D: true, clearProps: "transform" }
        );
      });
    },
    { scope: bannerRef }
  );

  return (
    <section
      ref={bannerRef}
      className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#CD5B34_0%,#B74823_58%,#9B3818_100%)] text-white shadow-[0_18px_36px_-14px_rgba(145,48,18,0.42)]"
    >
      <div className="grid grid-cols-12 items-stretch">
        <div className="col-span-7 flex flex-col justify-between p-5 sm:p-7 space-y-3">
          <div className="space-y-1.5">
            <h2 className="font-sans text-[24px] sm:text-[32px] font-extrabold uppercase leading-[0.98] tracking-[-0.025em] text-white">
              <span className="block">Fresh.</span>
              <span className="block">Plated.</span>
              <span className="block">To Suite.</span>
            </h2>
            <p className="text-[11.5px] sm:text-[13px] leading-snug text-white/88 max-w-[26ch]">
              Chef specials, artisan coffees & suite dining delivered fresh in 20–25 mins.
            </p>
          </div>

          {property && !property.irdEnabled && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-black/22 px-2.5 py-1.5 text-[10.5px] font-semibold text-white">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Ordering currently paused</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={onExploreClick || (() => smoothScrollToTarget("#ird-menu-items", 68))}
              className="inline-flex items-center gap-2 rounded-full bg-[#FFFBF6] px-4 py-2 text-[12px] font-bold text-[#3D1C11] shadow-[0_8px_18px_-6px_rgba(0,0,0,0.28)] transition-colors hover:bg-white btn-smooth-press cursor-pointer"
            >
              <span>Order Now</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#C44D27]" />
            </button>
          </div>
        </div>

        <div className="col-span-5 relative min-h-[176px] sm:min-h-[210px] overflow-hidden">
          <img
            src={property?.diningHeroUrl || "/in-room-dining-card.jpg"}
            alt="Artisanal In-Room Dining"
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/hero-cafe-banner.jpg";
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#B74823_0%,rgba(183,72,35,0.45)_24%,rgba(183,72,35,0)_62%)]"
          />
        </div>
      </div>

      {/* Subtle carousel indicator dots */}
      <div className="pointer-events-none absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
      </div>
    </section>
  );
}
