import React, { useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Clock,
  HelpCircle,
  Mail,
  Menu,
  PhoneCall,
  Play,
  X,
} from "lucide-react";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";
import { gsap, setupScrollBatchCards, smoothScrollToTarget, useGSAP } from "../ui/gsap";
import { Tilt3DCard } from "../ui/MotionPrimitives";
import { cn } from "../ui/utils";

export interface GuestServiceTile {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  imageSrc: string;
  icon: React.ReactNode;
  iconWrapperClassName?: string;
  activeBadgeText?: string | null;
  statusSummaryText?: string | null;
  statusActionLabel?: string | null;
  onStatusAction?: () => void;
  onSelect: () => void;
}

interface GuestServiceHubProps {
  stay: VerifiedStaySession;
  property?: PropertySettings | null;
  services: GuestServiceTile[];
  unreadInboxCount?: number;
  onOpenMenu?: () => void;
  onOpenOrders?: () => void;
  onOpenHousekeeping?: () => void;
  onOpenAttractions?: () => void;
  onOpenInbox?: () => void;
  onScrollToFaq?: () => void;
}

type SpotlightCategory = "ird" | "room-service" | "attractions" | "guide";

interface SpotlightItem {
  id: SpotlightCategory;
  chipLabel: string;
  tagLabel: string;
  titleTop: string;
  titleBottom: string;
  description: string;
  ctaLabel: string;
  imageSrc: string;
  onAction: () => void;
}

export function GuestServiceHub({
  stay,
  property,
  services,
  unreadInboxCount = 0,
  onOpenMenu,
  onOpenHousekeeping,
  onOpenAttractions,
  onOpenInbox,
  onScrollToFaq,
}: GuestServiceHubProps) {
  const hubRef = useRef<HTMLDivElement>(null);
  const spotlightCopyRef = useRef<HTMLDivElement>(null);
  const isFirstCategoryRender = useRef(true);
  const [selectedCategory, setSelectedCategory] = useState<SpotlightCategory>("ird");
  const [menuOpen, setMenuOpen] = useState(false);

  const activeServices = services.filter((s) => Boolean(s.statusSummaryText));
  const propertyName = property?.name?.trim() || "Seaview Sanctuary";
  const diningImage = property?.diningHeroUrl || "/in-room-dining-card.jpg";
  const careImage = property?.roomServiceHeroUrl || "/room-service-card.jpg";
  const exploreImage = property?.attractionsHeroUrl || property?.welcomeBgUrl || "/suite-welcome-card.jpg";
  const guideImage = property?.welcomeBgUrl || "/suite-welcome-card.jpg";
  const guestFirstName = stay.guestName?.trim().split(/\s+/)[0] || "Guest";
  const roomNumber = stay.room?.roomNumber?.trim() || "Suite";
  const logoSrc = property?.logoUrl || "/kusum-kunja-cafe-logo.png";

  const scrollToFaqSection = () => {
    if (onScrollToFaq) {
      onScrollToFaq();
    } else {
      smoothScrollToTarget("#guest-faq-section");
    }
  };

  const spotlightOptions = useMemo<SpotlightItem[]>(
    () => [
      {
        id: "ird",
        chipLabel: "Dining",
        tagLabel: "Recommended",
        titleTop: "In-Room",
        titleBottom: "Dining",
        description: `Chef specials, artisan coffees & suite dining delivered fresh for ${propertyName}.`,
        ctaLabel: "Browse Dining Menu",
        imageSrc: diningImage,
        onAction: () => onOpenMenu?.(),
      },
      {
        id: "room-service",
        chipLabel: "Care",
        tagLabel: "Concierge",
        titleTop: "Suite",
        titleBottom: "Care",
        description:
          "Request housekeeping refresh, crisp linens, toiletries, turndown, or luggage assistance anytime.",
        ctaLabel: "Request Service",
        imageSrc: careImage,
        onAction: () => onOpenHousekeeping?.(),
      },
      {
        id: "attractions",
        chipLabel: "Explore",
        tagLabel: "Sightseeing",
        titleTop: "Local",
        titleBottom: "Wonders",
        description:
          "Scenic landmarks, curated packages, transparent cab fares, and one-tap concierge booking.",
        ctaLabel: "Discover Places",
        imageSrc: exploreImage,
        onAction: () => onOpenAttractions?.(),
      },
      {
        id: "guide",
        chipLabel: "Guide",
        tagLabel: "House Guide",
        titleTop: "Resort",
        titleBottom: "FAQ & Info",
        description:
          "Check dining hours, Wi-Fi details, check-out timings, and frequently asked stay answers.",
        ctaLabel: "Read FAQ Guide",
        imageSrc: guideImage,
        onAction: scrollToFaqSection,
      },
    ],
    [careImage, diningImage, exploreImage, guideImage, onOpenAttractions, onOpenHousekeeping, onOpenMenu, propertyName]
  );

  const activeSpotlight =
    spotlightOptions.find((item) => item.id === selectedCategory) || spotlightOptions[0];

  // Initial hero entrance + scroll reveal for below-the-fold cards
  useGSAP(
    () => {
      const root = hubRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".gsap-luma-stagger",
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.055,
            ease: "power3.out",
            force3D: true,
            clearProps: "transform",
          }
        );
      });

      setupScrollBatchCards(root, ".gsap-hub-card", { stagger: 0.06, y: 16, start: "top 92%" });
    },
    { scope: hubRef }
  );

  // Subtle spotlight text transition only when user switches squircle chips
  useGSAP(
    () => {
      if (isFirstCategoryRender.current) {
        isFirstCategoryRender.current = false;
        return;
      }
      if (!spotlightCopyRef.current) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.fromTo(
        spotlightCopyRef.current,
        { autoAlpha: 0.35, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
          force3D: true,
          clearProps: "transform",
        }
      );
    },
    { scope: hubRef, dependencies: [selectedCategory] }
  );

  return (
    <div ref={hubRef} className="relative w-full">
      {/* Static 100svh prevents mobile URL-bar collapse/expand layout jiggle during touch scroll */}
      <section className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden bg-[#2D0D05] px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-8 sm:pb-10">
        {/* Atmospheric Photography with Warm Sandstone-Terracotta Scrim */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <img
            src={activeSpotlight.imageSrc}
            alt={propertyName}
            className="h-full w-full scale-[1.03] object-cover object-center brightness-[0.82] saturate-[1.18] transition-opacity duration-500 transform-gpu"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/suite-welcome-card.jpg";
            }}
          />
          <div className="absolute inset-0 luma-hero-scrim" />
        </div>

        {/* Minimalist Top Crest + Circle Utility Button */}
        <header className="gsap-luma-stagger relative z-30 mx-auto flex w-full max-w-md sm:max-w-2xl lg:max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
              <img
                src={logoSrc}
                alt={`${propertyName} crest`}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="hidden text-xs font-semibold tracking-wide text-white/85 sm:inline">
              {propertyName}
            </span>
          </div>

          <div className="relative flex items-center gap-2">
            {onOpenInbox && (
              <button
                type="button"
                onClick={onOpenInbox}
                aria-label="Open Suite Inbox"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-[#5C1F0E]/55 text-white transition-colors hover:bg-[#7D2C15]/70 btn-smooth-press-sm cursor-pointer"
              >
                <Mail className="h-[17px] w-[17px]" />
                {unreadInboxCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF5100] px-1 text-[9px] font-bold text-white tabular-nums">
                    {unreadInboxCount}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle quick concierge menu"
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-[#5C1F0E]/55 text-white transition-colors hover:bg-[#7D2C15]/70 btn-smooth-press-sm cursor-pointer"
            >
              {menuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 z-40 w-56 rounded-[22px] border border-white/18 bg-[#2E1008]/95 p-2 text-xs text-white shadow-[0_20px_48px_rgba(0,0,0,0.65)] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    smoothScrollToTarget("#hub-concierge-directory", 20);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium hover:bg-white/12 cursor-pointer"
                >
                  <span>All Suite Services</span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/60" />
                </button>
                {onOpenInbox && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenInbox();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium hover:bg-white/12 cursor-pointer"
                  >
                    <span>Suite Inbox</span>
                    {unreadInboxCount > 0 && (
                      <span className="rounded-full bg-[#FF5100] px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                        {unreadInboxCount}
                      </span>
                    )}
                  </button>
                )}
                {onScrollToFaq && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onScrollToFaq();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium hover:bg-white/12 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-white/70" /> House Guide & FAQ
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-white/60" />
                  </button>
                )}
                <div className="mt-1 border-t border-white/12 px-3 pt-2 pb-1 text-[11px] text-white/65">
                  Front Desk: <strong className="text-white">Ext. 0</strong>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Center Editorial Stack */}
        <div className="relative z-20 mx-auto my-auto w-full max-w-md sm:max-w-2xl lg:max-w-4xl py-6 sm:py-10">
          {/* Greeting Block */}
          <div className="gsap-luma-stagger mb-9 sm:mb-12 space-y-1">
            <h1 className="font-sans text-[28px] sm:text-[34px] font-medium tracking-[-0.025em] leading-tight text-white">
              Hi, <span className="font-normal text-white/75">{guestFirstName}!</span>
            </h1>
            <p className="text-[13px] sm:text-[14px] text-white/72 tabular-nums">
              Suite {roomNumber} · Welcome to {propertyName}
            </p>
          </div>

          {/* Spotlight Pillar Content */}
          <div ref={spotlightCopyRef} className="gsap-luma-stagger max-w-[340px] sm:max-w-[440px] space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/16 px-3.5 py-1 text-[11.5px] font-medium text-white/95">
              {activeSpotlight.tagLabel}
            </span>

            <h2 className="font-sans text-[42px] sm:text-[54px] font-semibold leading-[1.03] tracking-[-0.035em] text-white">
              <span className="block">{activeSpotlight.titleTop}</span>
              <span className="block">{activeSpotlight.titleBottom}</span>
            </h2>

            <p className="text-[13.5px] sm:text-[15px] leading-[1.55] text-white/84 max-w-[34ch]">
              {activeSpotlight.description}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={activeSpotlight.onAction}
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-[14px] font-semibold text-[#220B05] shadow-[0_16px_34px_-8px_rgba(0,0,0,0.52)] transition-transform hover:scale-[1.015] btn-smooth-press cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-[#220B05]" />
                <span>{activeSpotlight.ctaLabel}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lower Squircle Quick-Category Bar (Dining, Care, Explore, Guide) */}
        <div className="gsap-luma-stagger relative z-20 mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-4xl">
          <div
            className="grid grid-cols-4 gap-2 sm:gap-3"
            role="tablist"
            aria-label="Suite service spotlight selector"
          >
            {spotlightOptions.map((opt) => {
              const isSelected = selectedCategory === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedCategory(opt.id);
                    if (opt.id === "guide") {
                      scrollToFaqSection();
                    }
                  }}
                  className={cn(
                    "flex h-[50px] sm:h-[54px] items-center justify-center rounded-[18px] px-2 text-[12.5px] sm:text-[13.5px] font-medium transition-[background-color,border-color,transform,box-shadow] duration-150 btn-smooth-press-sm cursor-pointer truncate",
                    isSelected ? "luma-squircle-active font-semibold" : "luma-squircle"
                  )}
                >
                  {opt.chipLabel}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Below-the-Fold Full Concierge Overview (scroll reveal cleanly preserves every feature) */}
      <div
        id="hub-concierge-directory"
        className="relative z-10 mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl px-3 sm:px-6 pt-7 pb-6 space-y-5 sm:space-y-6"
      >
        {/* Active Requests Tracker Bar */}
        {activeServices.length > 0 && (
          <div className="gsap-hub-card rounded-[28px] border border-white/16 bg-[#31120A]/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_16px_38px_-14px_rgba(10,3,1,0.55)]">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/90 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 zomato-beacon-ring" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <Clock className="w-3.5 h-3.5 text-white/80" /> Active In-Suite Requests
              </div>
              <div className="text-xs text-white flex flex-wrap gap-2">
                {activeServices.map((srv) => (
                  <span
                    key={srv.id}
                    className="inline-flex items-center gap-1 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-semibold"
                  >
                    {srv.statusSummaryText}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-end sm:self-center">
              {activeServices.map(
                (srv) =>
                  srv.statusActionLabel &&
                  srv.onStatusAction && (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={srv.onStatusAction}
                      className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#220B05] btn-smooth-press-sm cursor-pointer"
                    >
                      {srv.statusActionLabel}
                    </button>
                  )
              )}
            </div>
          </div>
        )}

        {/* Service Cards */}
        <div
          className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${
            services.length >= 3 ? "lg:grid-cols-3" : ""
          }`}
        >
          {services.map((srv) => (
            <Tilt3DCard
              key={srv.id}
              onClick={srv.onSelect}
              className="gsap-hub-card cursor-pointer"
              surfaceClassName="group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/16 bg-[linear-gradient(180deg,rgba(62,23,12,0.88)_0%,rgba(40,14,7,0.96)_60%,rgba(28,9,4,0.99)_100%)] shadow-[0_18px_42px_-14px_rgba(10,3,1,0.58)]"
            >
              <div>
                <div className="relative h-[186px] w-full overflow-hidden">
                  <img
                    src={srv.imageSrc}
                    alt={srv.title}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(40,14,7,0)_0%,rgba(40,14,7,0.62)_62%,rgba(40,14,7,0.98)_100%)]" />
                </div>

                <div className="-mt-4 px-5 pb-4 space-y-2.5 relative z-10">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-sans text-[20px] font-bold tracking-tight text-white leading-tight">
                      {srv.title}
                    </h3>
                    <span className="shrink-0 rounded-full border border-white/18 bg-white/12 px-2.5 py-1 text-[11px] font-bold text-white">
                      {srv.activeBadgeText || "24/7"}
                    </span>
                  </div>

                  <p className="text-[12.5px] leading-[1.55] text-white/75 line-clamp-3">
                    {srv.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                      {srv.subtitle}
                    </span>
                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 tabular-nums">
                      Suite {roomNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-1">
                <div className="flex w-full items-center justify-center rounded-full bg-white py-3 text-[13px] font-bold text-[#220B05] transition-transform duration-200 group-hover:scale-[1.01]">
                  {srv.ctaLabel}
                </div>
              </div>
            </Tilt3DCard>
          ))}
        </div>

        {/* Front Desk Extension Card */}
        <div className="gsap-hub-card rounded-[24px] border border-white/16 bg-[#31120A]/90 p-4 sm:p-5 flex items-center justify-between gap-3 text-xs text-white/78">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">Need Special Concierge Assistance?</span>
              <span>
                Dial <strong className="text-white">Extension 0</strong> from your in-suite telephone. Available 24 hours.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
