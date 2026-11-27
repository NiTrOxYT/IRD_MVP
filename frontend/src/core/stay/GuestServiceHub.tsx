import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  HelpCircle,
  Mail,
  Menu,
  PhoneCall,
  X,
} from "lucide-react";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";
import {
  LandmarkCompassIcon,
  SilverClocheTrayIcon,
  SuiteCareBellIcon,
} from "../ui/CustomResortIcons";
import { gsap, smoothScrollToTarget, useGSAP } from "../ui/gsap";
import { cn } from "../ui/utils";

export const DEFAULT_LANDING_VIDEO_URL = "/landing-welcome.mp4";

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
  activeOrdersCount?: number;
  onOpenMenu?: () => void;
  onOpenOrders?: () => void;
  onOpenHousekeeping?: () => void;
  onOpenAttractions?: () => void;
  onOpenInbox?: () => void;
  onScrollToFaq?: () => void;
}

interface GlassServiceCardItem {
  id: string;
  title: string;
  description: string;
  badge?: string | null;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface HubVideoBackdropProps {
  videoUrl?: string | null;
  posterUrl?: string | null;
}

/**
 * Full-viewport GPU-composited looping backdrop for the Home screen.
 * Rendered outside PageTransition so transform animations never shift fixed positioning.
 */
export function HubVideoBackdrop({ videoUrl, posterUrl }: HubVideoBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const primaryVideo = videoUrl?.trim() || DEFAULT_LANDING_VIDEO_URL;
  const [videoSrc, setVideoSrc] = useState(primaryVideo);

  useEffect(() => {
    setVideoSrc(primaryVideo);
  }, [primaryVideo]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = true;
    const playPromise = videoEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }, [videoSrc]);

  const posterSrc = posterUrl || "/suite-loader-scene.jpg";

  return (
    <div aria-hidden="true" className="hub-video-stage">
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        poster={posterSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className="hub-video-media"
        onError={() => {
          if (videoSrc !== DEFAULT_LANDING_VIDEO_URL) {
            setVideoSrc(DEFAULT_LANDING_VIDEO_URL);
          }
        }}
      />
      {/* Clear upper window for looping video; smooth tonal scrim from 60% down for glass legibility */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,20,11,0.38)_0%,rgba(16,20,11,0.04)_24%,rgba(16,20,11,0.04)_56%,rgba(16,20,11,0.5)_78%,rgba(16,20,11,0.68)_100%)]" />
    </div>
  );
}

export function GuestServiceHub({
  stay,
  property,
  services,
  unreadInboxCount = 0,
  activeOrdersCount = 0,
  onOpenMenu,
  onOpenOrders,
  onOpenHousekeeping,
  onOpenAttractions,
  onOpenInbox,
  onScrollToFaq,
}: GuestServiceHubProps) {
  const hubRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeServices = services.filter((s) => Boolean(s.statusSummaryText));
  const propertyName = property?.name?.trim() || "Broz Resorts";
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

  const irdTile = services.find((s) => s.id === "ird");
  const careTile = services.find((s) => s.id === "room-service");
  const exploreTile = services.find((s) => s.id === "attractions");

  const glassCards = useMemo<GlassServiceCardItem[]>(
    () => [
      {
        id: "dining",
        title: "In-Room Dining",
        description: "Chef specials, artisan coffees & suite dining",
        badge: irdTile?.activeBadgeText || null,
        icon: <SilverClocheTrayIcon className="h-5 w-5" />,
        onSelect: () => onOpenMenu?.(),
      },
      {
        id: "care",
        title: "Suite Care",
        description: "Housekeeping, crisp linens & amenities",
        badge: careTile?.activeBadgeText || null,
        icon: <SuiteCareBellIcon className="h-5 w-5" />,
        onSelect: () => onOpenHousekeeping?.(),
      },
      {
        id: "explore",
        title: "Local Attractions",
        description: "Scenic landmarks, cab fares & packages",
        badge: null,
        icon: <LandmarkCompassIcon className="h-5 w-5" />,
        onSelect: () => onOpenAttractions?.(),
      },
      {
        id: "orders",
        title: "Live Orders",
        description: "Kitchen ticket status & folio total",
        badge: activeOrdersCount > 0 ? `${activeOrdersCount} live` : null,
        icon: <Clock className="h-5 w-5" />,
        onSelect: () => onOpenOrders?.(),
      },
      {
        id: "inbox",
        title: "Suite Inbox",
        description: "Concierge notices & room updates",
        badge: unreadInboxCount > 0 ? `${unreadInboxCount} new` : null,
        icon: <Mail className="h-5 w-5" />,
        onSelect: () => onOpenInbox?.(),
      },
      {
        id: "guide",
        title: "House Guide",
        description: "Dining hours, Wi-Fi & stay FAQ",
        badge: null,
        icon: <HelpCircle className="h-5 w-5" />,
        onSelect: scrollToFaqSection,
      },
    ],
    [
      activeOrdersCount,
      careTile?.activeBadgeText,
      irdTile?.activeBadgeText,
      onOpenAttractions,
      onOpenHousekeeping,
      onOpenInbox,
      onOpenMenu,
      onOpenOrders,
      unreadInboxCount,
    ]
  );

  useGSAP(
    () => {
      const root = hubRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".gsap-moss-enter",
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.045,
            ease: "power3.out",
            force3D: true,
            clearProps: "transform",
          }
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".gsap-moss-enter", { autoAlpha: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: hubRef }
  );

  // Suppress unused var warning while keeping tile fallbacks aligned
  void exploreTile;

  return (
    <div
      ref={hubRef}
      className="relative w-full overflow-x-clip bg-transparent text-[#F4F1E6]"
    >
      {/* Top Bar + Open 70% Viewport Panorama Window over Full-Page Looping Video */}
      <section className="relative flex min-h-[70svh] w-full flex-col justify-between px-5 pt-6 sm:px-8 sm:pt-7">
        {/* Minimalist Top Bar: Crest + Inbox + Menu */}
        <header className="gsap-moss-enter relative z-30 mx-auto flex w-full max-w-md sm:max-w-2xl lg:max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/35 bg-[#FFFDF9]/92 p-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.28)]">
              <img
                src={logoSrc}
                alt={`${propertyName} crest`}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-xs font-semibold tracking-wide text-[#F7F4EC] drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
                {propertyName}
              </span>
              <span className="block text-[10.5px] text-[#EDE8D8]/85 tabular-nums drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
                Suite {roomNumber}
              </span>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            {onOpenInbox && (
              <button
                type="button"
                onClick={onOpenInbox}
                aria-label="Open Suite Inbox"
                className="liquid-glass-pill relative flex h-10 w-10 items-center justify-center rounded-full text-[#F6F3EA] transition-colors btn-smooth-press-sm cursor-pointer"
              >
                <Mail className="h-[17px] w-[17px]" />
                {unreadInboxCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C44D27] px-1 text-[9px] font-bold text-white tabular-nums">
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
              className="liquid-glass-pill flex h-10 w-10 items-center justify-center rounded-full text-[#F6F3EA] transition-colors btn-smooth-press-sm cursor-pointer"
            >
              {menuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>

            {menuOpen && (
              <div className="liquid-glass-card absolute right-0 top-12 z-40 w-56 rounded-[22px] p-2 text-xs text-[#F6F3EA]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    smoothScrollToTarget("#hub-services-grid", 20);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium hover:bg-white/14 cursor-pointer"
                >
                  <span>All Suite Services</span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/65" />
                </button>
                {onOpenOrders && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenOrders();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium hover:bg-white/14 cursor-pointer"
                  >
                    <span>Live Orders</span>
                    {activeOrdersCount > 0 && (
                      <span className="rounded-full bg-[#C44D27] px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                        {activeOrdersCount}
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
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium hover:bg-white/14 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-white/75" /> House Guide &amp; FAQ
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-white/65" />
                  </button>
                )}
                <div className="mt-1 border-t border-white/16 px-3 pt-2 pb-1 text-[11px] text-[#E6E0CA]/82">
                  Front Desk: <strong className="text-[#F8F5EE]">Ext. 0</strong>
                </div>
              </div>
            )}
          </div>
        </header>
      </section>

      {/* Greeting Text & Liquid Glass Options Starting at 80% Screen Height */}
      <div
        id="hub-services-grid"
        className="relative z-10 mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-4xl px-5 sm:px-8 pt-2 pb-4 space-y-5 sm:space-y-6"
      >
        {/* Editorial Greeting & Sanctuary Title */}
        <div className="gsap-moss-enter space-y-1.5">
          <p className="text-[13px] sm:text-[14px] font-medium tracking-[0.04em] text-[#EFEAD8]/95 drop-shadow-[0_2px_10px_rgba(10,12,7,0.5)]">
            Welcome, {guestFirstName}
          </p>
          <h1 className="font-sans text-[34px] sm:text-[46px] font-bold leading-[1.06] tracking-tight text-[#FAF8F2] drop-shadow-[0_4px_18px_rgba(10,12,7,0.55)]">
            {propertyName}
          </h1>
          <p className="pt-1 max-w-[44ch] text-[13.5px] sm:text-[14.5px] leading-relaxed text-[#EBE6D5]/92 drop-shadow-[0_2px_10px_rgba(10,12,7,0.5)]">
            Feel at home in Suite {roomNumber}. Dining, suite care, and local exploration curated for your stay.
          </p>
        </div>

        {/* Editorial Divider Row */}
        <div className="gsap-moss-enter flex items-center gap-3 pt-1 text-[11px] font-medium tracking-[0.14em] uppercase text-[#EDE8D6]/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
          <span className="shrink-0">Suite Services</span>
          <span className="h-px flex-1 bg-white/24" aria-hidden="true" />
          <span className="shrink-0 tabular-nums">Suite {roomNumber}</span>
        </div>

        {/* Active Live Requests Banner (Liquid Glass) */}
        {activeServices.length > 0 && (
          <div className="gsap-moss-enter liquid-glass-card rounded-[24px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#FAF8F2] flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 zomato-beacon-ring" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span>Active In-Suite Requests</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-[#F3EFE2]">
                {activeServices.map((srv) => (
                  <span
                    key={srv.id}
                    className="liquid-glass-chip inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
                  >
                    {srv.statusSummaryText}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
              {activeServices.map(
                (srv) =>
                  srv.statusActionLabel &&
                  srv.onStatusAction && (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={srv.onStatusAction}
                      className="liquid-glass-chip rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold text-[#FAF8F2] transition-colors hover:bg-white/24 btn-smooth-press-sm cursor-pointer"
                    >
                      {srv.statusActionLabel}
                    </button>
                  )
              )}
            </div>
          </div>
        )}

        {/* Transparent Liquid Glass Services Grid (2-col mobile / 3-col desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {glassCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.onSelect}
              className="gsap-moss-enter liquid-glass-card liquid-glass-card-interactive group relative flex min-h-[144px] sm:min-h-[164px] flex-col justify-between overflow-hidden rounded-[24px] p-4 sm:p-5 text-left transition-[background,border-color] duration-200 btn-smooth-press cursor-pointer"
            >
              {/* Subtle upper-left specular liquid sheen */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-white/[0.09] blur-xl"
              />

              <div className="relative flex items-start justify-between gap-2 w-full">
                <span className="liquid-glass-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#F5F1E3] transition-colors group-hover:text-white">
                  {card.icon}
                </span>
                {card.badge && (
                  <span className="inline-flex items-center rounded-full border border-[#F2D593]/45 bg-[#E9C77D]/20 px-2 py-0.5 text-[10px] font-semibold text-[#F9E7BC] tabular-nums">
                    {card.badge}
                  </span>
                )}
              </div>

              <div className="relative mt-3 space-y-1">
                <h2 className="font-sans text-[15px] sm:text-[16px] font-semibold leading-snug tracking-tight text-[#FAF8F2] drop-shadow-[0_1px_4px_rgba(0,0,0,0.28)]">
                  {card.title}
                </h2>
                <p className="text-[11.5px] sm:text-[12px] leading-snug text-[#ECE7D6]/85 line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
                  {card.description}
                </p>
              </div>

              <div className="relative mt-3 flex items-center justify-between text-[11px] font-medium text-[#EFEAD8]/85 group-hover:text-white">
                <span>Open</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Liquid Glass Concierge Info Strip */}
        <div className="gsap-moss-enter liquid-glass-card rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="liquid-glass-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#F5F1E3]">
              <PhoneCall className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#FAF8F2]">24-Hour Suite Concierge</p>
              <p className="text-xs text-[#EBE6D5]/85">
                Dial <strong className="font-semibold text-[#FAF8F2]">Extension 0</strong> from your in-suite phone anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-white/16 pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-5 text-left sm:text-right">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-[#EAE4D1]/78">
                Dining Hours
              </span>
              <span className="font-mono text-xs font-semibold text-[#FAF8F2] tabular-nums">
                {property?.openingTime || "06:00"} – {property?.closingTime || "23:30"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
