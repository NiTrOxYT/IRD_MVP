import React from "react";
import { ArrowRight, Phone } from "lucide-react";
import type { VerifiedStaySession } from "../property/propertyTypes";
import { Tilt3DCard } from "../ui/MotionPrimitives";
import { ArchFolioIcon } from "../ui/EnterpriseIcons";

export interface GuestServiceTile {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  imageSrc: string;
  icon: React.ReactNode;
  activeBadgeText?: string | null;
  statusSummaryText?: string | null;
  statusActionLabel?: string | null;
  onStatusAction?: () => void;
  onSelect: () => void;
}

interface GuestServiceHubProps {
  stay: VerifiedStaySession;
  services: GuestServiceTile[];
}

export function GuestServiceHub({ stay, services }: GuestServiceHubProps) {
  const activeServices = services.filter((s) => Boolean(s.statusSummaryText));

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-7">
      {/* Asymmetric Editorial Suite Masthead */}
      <section className="overflow-hidden rounded-xl border border-[rgba(20,18,16,0.1)] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.03)]">
        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between gap-5 p-6 sm:p-8 lg:p-10">
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#847C73]">
                Prepared for {stay.guestName || "Guest"}
              </p>
              <h1 className="font-serif text-[34px] font-semibold leading-[1.04] tracking-[-0.02em] text-[#141210] sm:text-[44px]">
                Suite <span className="tabular-nums">{stay.room?.roomNumber}</span>
              </h1>
              <p className="max-w-[44ch] text-[13.5px] leading-relaxed text-[#5C554E] sm:text-sm">
                Private dining, suite replenishment, and curated local itineraries dispatched directly to our hospitality desk.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[rgba(20,18,16,0.08)] pt-4 text-xs text-[#5C554E]">
              <span>24-hour suite reception</span>
              <span className="h-3 w-px bg-[rgba(20,18,16,0.14)]" aria-hidden="true" />
              <span>Real-time kitchen & butler status</span>
            </div>
          </div>

          <div className="relative aspect-[16/10] w-full overflow-hidden border-t border-[rgba(20,18,16,0.08)] bg-[#EFECE5] md:aspect-auto md:min-h-[260px] md:border-l md:border-t-0">
            <img
              src="/suite-welcome-card.jpg"
              alt={`Suite ${stay.room?.roomNumber || ""} interior`}
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* Live Request Ledger (Only shown when active requests/orders exist) */}
      {activeServices.length > 0 && (
        <section
          aria-label="Active suite requests"
          className="flex flex-col gap-3 rounded-xl border border-[#D9C7A3] bg-[#FBF8F1] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="flex items-start gap-3">
            <ArchFolioIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#966F29]" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#141210]">
              <span className="font-semibold">Live dispatch</span>
              {activeServices.map((srv) => (
                <span
                  key={srv.id}
                  className="inline-flex items-center rounded-md border border-[#E2D4B7] bg-white px-2.5 py-0.5 text-xs font-medium text-[#5C554E] tabular-nums"
                >
                  {srv.statusSummaryText}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 self-end sm:self-center">
            {activeServices.map(
              (srv) =>
                srv.statusActionLabel &&
                srv.onStatusAction && (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={srv.onStatusAction}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141210] underline underline-offset-4 decoration-[#966F29]/50 transition-colors hover:text-[#966F29]"
                  >
                    <span>{srv.statusActionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )
            )}
          </div>
        </section>
      )}

      {/* Architectural Service Directory */}
      <section aria-label="Suite services directory">
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 ${
            services.length >= 3 ? "lg:grid-cols-3" : ""
          }`}
        >
          {services.map((srv) => (
            <Tilt3DCard
              key={srv.id}
              maxTilt={3.5}
              onClick={srv.onSelect}
              className="cursor-pointer"
              surfaceClassName="group flex h-full flex-col overflow-hidden rounded-xl border border-[rgba(20,18,16,0.1)] bg-white hover:border-[rgba(20,18,16,0.28)]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EFECE5]">
                <img
                  src={srv.imageSrc}
                  alt={srv.title}
                  className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                {srv.activeBadgeText && (
                  <span className="absolute right-3 top-3 rounded-md border border-[rgba(20,18,16,0.12)] bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[#141210] tabular-nums backdrop-blur-sm">
                    {srv.activeBadgeText}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between border-t border-[rgba(20,18,16,0.08)] p-5">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-serif text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[#141210] transition-colors group-hover:text-[#966F29]">
                      {srv.title}
                    </h2>
                    <span className="mt-0.5 shrink-0 text-[#847C73] transition-colors group-hover:text-[#141210]">
                      {srv.icon}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#5C554E]">{srv.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[rgba(20,18,16,0.07)] pt-3.5 text-xs font-medium text-[#141210]">
                  <span>{srv.ctaLabel}</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 text-[#847C73] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#141210]"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            </Tilt3DCard>
          ))}
        </div>
      </section>

      {/* Architectural Concierge Footer Strip */}
      <footer className="flex flex-col gap-2 rounded-xl border border-[rgba(20,18,16,0.09)] bg-white px-5 py-4 text-xs text-[#5C554E] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 shrink-0 text-[#966F29]" strokeWidth={1.4} />
          <span>
            Concierge desk available 24 hours via in-suite telephone.
          </span>
        </div>
        <span className="font-medium text-[#141210] tabular-nums">Dial Extension 0</span>
      </footer>
    </div>
  );
}
