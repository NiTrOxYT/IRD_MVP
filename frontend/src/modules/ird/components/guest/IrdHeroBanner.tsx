import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { gsap, smoothScrollToTarget, useGSAP } from "../../../../core/ui/gsap";
import { cn } from "../../../../core/ui/utils";
import type { IrdHeroCard, IrdPropertyConfig } from "../../types";

interface IrdHeroBannerProps {
  property?: IrdPropertyConfig | null;
  heroCards?: IrdHeroCard[];
  onExploreClick?: () => void;
}

const DEFAULT_HERO_CARD: IrdHeroCard = {
  id: 0,
  title: "Fresh.\nPlated.\nTo Suite.",
  subtitle: "Chef specials, artisan coffees & suite dining delivered fresh in 20–25 mins.",
  ctaLabel: "Order Now",
  imageUrl: "/in-room-dining-card.jpg",
  isActive: true,
  sortOrder: 1,
};

export function IrdHeroBanner({ property, heroCards, onExploreClick }: IrdHeroBannerProps) {
  const bannerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = useMemo<IrdHeroCard[]>(() => {
    const source =
      heroCards && heroCards.length > 0
        ? heroCards
        : property?.diningHeroCards && property.diningHeroCards.length > 0
        ? property.diningHeroCards
        : null;

    if (source) {
      const active = source.filter((c) => c.isActive !== false);
      if (active.length > 0) return active;
    }

    return [
      {
        ...DEFAULT_HERO_CARD,
        imageUrl: property?.diningHeroUrl || DEFAULT_HERO_CARD.imageUrl,
      },
    ];
  }, [heroCards, property?.diningHeroCards, property?.diningHeroUrl]);

  const safeIndex = activeIndex < slides.length ? activeIndex : 0;

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  // Subtle initial entrance
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

  // Slide horizontal track via GSAP whenever activeIndex changes
  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track) return;
      const targetX = -(safeIndex * 100);
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        gsap.set(track, { xPercent: targetX });
      } else {
        gsap.to(track, {
          xPercent: targetX,
          duration: 0.48,
          ease: "power3.out",
          force3D: true,
          overwrite: "auto",
        });
      }
    },
    { scope: bannerRef, dependencies: [safeIndex, slides.length] }
  );

  const goToSlide = useCallback(
    (index: number) => {
      if (slides.length <= 1) return;
      const next = ((index % slides.length) + slides.length) % slides.length;
      setActiveIndex(next);
    },
    [slides.length]
  );

  // Auto-advance slides when idle
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [slides.length, isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (slides.length <= 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    setIsPaused(true);
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (slides.length <= 1 || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) {
      touchStartRef.current = null;
      return;
    }
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
      goToSlide(dx < 0 ? safeIndex + 1 : safeIndex - 1);
    }
  };

  const handleExplore = onExploreClick || (() => smoothScrollToTarget("#ird-menu-items", 68));

  return (
    <section
      ref={bannerRef}
      aria-roledescription="carousel"
      aria-label="In-Room Dining Highlights"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="group relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#CD5B34_0%,#B74823_58%,#9B3818_100%)] text-white shadow-[0_18px_36px_-14px_rgba(145,48,18,0.42)] touch-pan-y select-none"
    >
      <div ref={trackRef} className="flex w-full will-change-transform">
        {slides.map((slide, idx) => {
          const titleLines = slide.title
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          const slideImage = slide.imageUrl || "/in-room-dining-card.jpg";

          return (
            <div
              key={`${slide.id}-${idx}`}
              aria-hidden={idx !== safeIndex}
              className="w-full shrink-0 grid grid-cols-12 items-stretch"
            >
              <div
                className={cn(
                  "col-span-7 flex flex-col justify-between p-5 sm:p-7 space-y-3",
                  slides.length > 1 && "pb-8 sm:pb-8"
                )}
              >
                <div className="space-y-1.5">
                  <h2 className="font-sans text-[24px] sm:text-[32px] font-extrabold uppercase leading-[0.98] tracking-[-0.025em] text-white">
                    {titleLines.length > 1 ? (
                      titleLines.map((line, lineIdx) => (
                        <span key={lineIdx} className="block">
                          {line}
                        </span>
                      ))
                    ) : (
                      slide.title
                    )}
                  </h2>
                  {slide.subtitle && (
                    <p className="text-[11.5px] sm:text-[13px] leading-snug text-white/88 max-w-[26ch] line-clamp-3">
                      {slide.subtitle}
                    </p>
                  )}
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
                    onClick={handleExplore}
                    className="inline-flex items-center gap-2 rounded-full bg-[#FFFBF6] px-4 py-2 text-[12px] font-bold text-[#3D1C11] shadow-[0_8px_18px_-6px_rgba(0,0,0,0.28)] transition-colors hover:bg-white btn-smooth-press cursor-pointer"
                  >
                    <span>{slide.ctaLabel || "Order Now"}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#C44D27]" />
                  </button>
                </div>
              </div>

              <div className="col-span-5 relative min-h-[186px] sm:min-h-[218px] overflow-hidden">
                <img
                  key={`${slide.id}-${slideImage}`}
                  src={slideImage}
                  alt={slide.title.replace(/\s+/g, " ")}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover object-center"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallbackApplied) {
                      img.dataset.fallbackApplied = "1";
                      img.src = "/in-room-dining-card.jpg";
                    }
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#B74823_0%,rgba(183,72,35,0.45)_24%,rgba(183,72,35,0)_62%)]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtle desktop arrow controls when multiple cards exist */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goToSlide(safeIndex - 1)}
            aria-label="Previous promo card"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white/90 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100 hover:bg-black/45 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToSlide(safeIndex + 1)}
            aria-label="Next promo card"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white/90 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100 hover:bg-black/45 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Interactive carousel indicator dots */}
      {slides.length > 1 && (
        <div
          role="tablist"
          aria-label="Promo card slides"
          className="absolute bottom-2.5 inset-x-0 z-10 flex items-center justify-center gap-1.5"
        >
          {slides.map((slide, idx) => {
            const active = idx === safeIndex;
            return (
              <button
                key={slide.id || idx}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Show slide ${idx + 1}: ${slide.title.replace(/\s+/g, " ")}`}
                onClick={() => goToSlide(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                  active ? "w-5 bg-white shadow-2xs" : "w-1.5 bg-white/40 hover:bg-white/70"
                )}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
