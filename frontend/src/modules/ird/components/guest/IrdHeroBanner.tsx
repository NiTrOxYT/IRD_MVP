import React, { useRef } from "react";
import { AlertCircle, Clock } from "lucide-react";
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
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.36, ease: "power2.out", force3D: true, clearProps: "transform" }
        );
      });
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(".gsap-ird-hero-img", {
          yPercent: 12,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      });
    },
    { scope: bannerRef }
  );

  return (
    <section
      ref={bannerRef}
      className="relative overflow-hidden rounded-[32px] frost-component-card"
    >
      <div className="relative h-[210px] sm:h-[250px] w-full overflow-hidden">
        <img
          src="/in-room-dining-card.jpg"
          alt="Artisanal In-Room Dining"
          loading="eager"
          decoding="async"
          className="gsap-ird-hero-img h-full w-full scale-105 object-cover object-center"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/hero-cafe-banner.jpg";
          }}
        />
        <div className="pointer-events-none absolute inset-0 frost-component-fade" />

        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        </div>
      </div>

      <div className="relative z-10 -mt-3 space-y-3.5 px-5 pb-6 sm:px-7 sm:pb-7">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-sans text-[22px] sm:text-[28px] font-bold tracking-tight text-white leading-tight">
            In-Room Dining
          </h2>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full frost-pill-chip px-3 py-1 text-xs font-bold text-white tabular-nums">
            <Clock className="h-3 w-3 text-white/80" />
            20–25m
          </span>
        </div>

        <p className="text-[12.5px] sm:text-[13.5px] leading-relaxed text-white/75 max-w-[52ch]">
          Freshly prepared dishes, artisan coffees, and chef specials plated and delivered straight to your suite.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold">
            Chef Curated
          </span>
          {property?.openingTime?.trim() && property?.closingTime?.trim() && (
            <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold tabular-nums">
              {property.openingTime} – {property.closingTime}
            </span>
          )}
        </div>

        {property && !property.irdEnabled && (
          <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-300/35 text-rose-100 text-[11px] font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span>In-room ordering paused by front desk.</span>
          </div>
        )}

        <button
          type="button"
          onClick={onExploreClick || (() => smoothScrollToTarget("#ird-menu-items", 68))}
          className="flex w-full items-center justify-center rounded-full frost-cta-white py-3 text-[13px] font-bold btn-smooth-press cursor-pointer"
        >
          Explore Menu
        </button>
      </div>
    </section>
  );
}
