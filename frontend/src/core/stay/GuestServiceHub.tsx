import React, { useRef } from "react";
import { Clock, Mail, PhoneCall } from "lucide-react";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";
import { gsap, setupScrollBatchCards, useGSAP } from "../ui/gsap";
import { Tilt3DCard } from "../ui/MotionPrimitives";

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

export function GuestServiceHub({
  stay,
  property,
  services,
  unreadInboxCount = 0,
  onOpenMenu,
  onOpenInbox,
  onScrollToFaq,
}: GuestServiceHubProps) {
  const hubRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const activeServices = services.filter((s) => Boolean(s.statusSummaryText));
  const propertyName = property?.name?.trim() || "Seaview Sanctuary";
  const heroPhoto = property?.welcomeBgUrl || "/suite-welcome-card.jpg";

  useGSAP(
    () => {
      const root = hubRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        if (heroRef.current) {
          gsap.to(".gsap-hub-hero-photo", {
            yPercent: 12,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 0.5,
            },
          });
        }
      });

      setupScrollBatchCards(root, ".gsap-hub-card", { stagger: 0.055, y: 16 });
    },
    { scope: hubRef }
  );

  return (
    <div ref={hubRef} className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-5 sm:space-y-6">
      {/* Reference 2 Frosted Component Hero Card (Top Photo -> Seamless Frosted Dark Surface) */}
      <section
        ref={heroRef}
        className="gsap-hub-card relative overflow-hidden rounded-[32px] frost-component-card"
      >
        <div className="relative h-[220px] sm:h-[260px] w-full overflow-hidden">
          <img
            src={heroPhoto}
            alt={propertyName}
            className="gsap-hub-hero-photo h-full w-full scale-105 object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/suite-welcome-card.jpg";
            }}
          />
          <div className="pointer-events-none absolute inset-0 frost-component-fade" />

          {/* Subtle carousel indicator dots matching Reference 2 */}
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
        </div>

        <div className="relative z-10 -mt-3 space-y-3.5 px-5 pb-6 sm:px-7 sm:pb-7">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-sans text-[22px] sm:text-[28px] font-bold tracking-tight text-white leading-tight">
              {propertyName}
            </h2>
            <span className="shrink-0 rounded-full frost-pill-chip px-3 py-1 text-xs font-bold text-white tabular-nums">
              Suite {stay.room?.roomNumber}
            </span>
          </div>

          <p className="text-[12.5px] sm:text-[13.5px] leading-relaxed text-white/75 max-w-[54ch]">
            Welcome, {stay.guestName}. Browse bespoke in-suite dining, housekeeping care, and curated local discoveries from one calm place.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold">
              In-Suite Butler
            </span>
            <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold">
              24/7 Live Service
            </span>
            {onOpenInbox && (
              <button
                type="button"
                onClick={onOpenInbox}
                className="inline-flex items-center gap-1.5 rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold cursor-pointer"
              >
                <Mail className="h-3 w-3" />
                <span>Suite Inbox</span>
                {unreadInboxCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white tabular-nums">
                    {unreadInboxCount}
                  </span>
                )}
              </button>
            )}
            {onScrollToFaq && (
              <button
                type="button"
                onClick={onScrollToFaq}
                className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold cursor-pointer"
              >
                House Guide
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenMenu}
            className="mt-1 flex w-full items-center justify-center rounded-full frost-cta-white py-3 text-[13px] font-bold btn-smooth-press cursor-pointer"
          >
            Browse Dining Menu
          </button>
        </div>
      </section>

      {/* Active Requests Tracker Bar */}
      {activeServices.length > 0 && (
        <div className="gsap-hub-card rounded-[28px] frost-component-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                  className="inline-flex items-center gap-1 rounded-full frost-pill-chip px-3 py-1 text-xs font-semibold"
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
                    className="rounded-full frost-cta-white px-4 py-1.5 text-xs font-bold btn-smooth-press-sm"
                  >
                    {srv.statusActionLabel}
                  </button>
                )
            )}
          </div>
        </div>
      )}

      {/* Main Service Cards — Exact Reference 2 ("Iceland Cabin") Frosted Fade Architecture */}
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
            surfaceClassName="group relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] frost-component-card"
          >
            <div>
              {/* Top Seamless Photo fading straight into Frosted Dark Surface */}
              <div className="relative h-[196px] w-full overflow-hidden">
                <img
                  src={srv.imageSrc}
                  alt={srv.title}
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 frost-component-fade" />

                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                </div>
              </div>

              <div className="-mt-2 px-5 pb-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-sans text-[20px] font-bold tracking-tight text-white leading-tight">
                    {srv.title}
                  </h3>
                  <span className="shrink-0 rounded-full frost-pill-chip px-2.5 py-1 text-[11px] font-bold text-white">
                    {srv.activeBadgeText || "24/7"}
                  </span>
                </div>

                <p className="text-[12.5px] leading-[1.55] text-white/75 line-clamp-3">
                  {srv.description}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold">
                    {srv.subtitle}
                  </span>
                  <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold">
                    Suite {stay.room?.roomNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-1">
              <div className="flex w-full items-center justify-center rounded-full frost-cta-white py-3 text-[13px] font-bold transition-transform duration-200 group-hover:scale-[1.01]">
                {srv.ctaLabel}
              </div>
            </div>
          </Tilt3DCard>
        ))}
      </div>

      {/* Front Desk Extension Frosted Card */}
      <div className="gsap-hub-card rounded-[26px] frost-component-card p-4 sm:p-5 flex items-center justify-between gap-3 text-xs text-white/75">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full frost-pill-chip text-white">
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
  );
}
