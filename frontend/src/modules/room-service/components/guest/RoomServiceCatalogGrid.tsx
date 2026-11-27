import React, { useMemo, useRef } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SuiteCareBellIcon } from "../../../../core/ui/CustomResortIcons";
import { setupScrollBatchCards, useGSAP } from "../../../../core/ui/gsap";
import type { RoomServiceCatalogItem } from "../../types";

interface RoomServiceCatalogGridProps {
  services: RoomServiceCatalogItem[];
  onSelectService: (service: RoomServiceCatalogItem) => void;
}

const FEATURED_TYPES = new Set(["cleaning", "turndown"]);

export function RoomServiceCatalogGrid({ services, onSelectService }: RoomServiceCatalogGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const { signatureServices, amenityServices } = useMemo(() => {
    const featured = services.filter((s) => FEATURED_TYPES.has(s.type));
    const rest = services.filter((s) => !FEATURED_TYPES.has(s.type));
    if (featured.length === 0) {
      return { signatureServices: services.slice(0, 2), amenityServices: services.slice(2) };
    }
    return { signatureServices: featured, amenityServices: rest };
  }, [services]);

  useGSAP(
    () => {
      if (!gridRef.current) return;
      setupScrollBatchCards(gridRef.current, ".gsap-rs-card", { stagger: 0.035, y: 10, start: "top 95%" });
    },
    { scope: gridRef, dependencies: [services.length] }
  );

  return (
    <div ref={gridRef} className="space-y-6 font-sans">
      {/* Tier 1: Signature Butler Rituals */}
      {signatureServices.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-sans text-[17px] sm:text-xl font-bold tracking-tight text-[#FAF8F2] flex items-center gap-2">
              <SuiteCareBellIcon className="h-4 w-4 text-[#C5CE9F]" />
              <span>Signature Suite Rituals</span>
            </h2>
            <span className="text-[11px] font-medium text-[#B9B5A5]">Tap to schedule</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {signatureServices.map((srv) => {
              const Icon = srv.icon;
              return (
                <button
                  key={srv.type}
                  type="button"
                  onClick={() => onSelectService(srv)}
                  className="gsap-rs-card group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/16 bg-[linear-gradient(155deg,#25281D_0%,#1A1C14_100%)] p-5 text-left shadow-[0_16px_34px_-16px_rgba(0,0,0,0.65)] transition-colors hover:border-white/32 btn-smooth-press cursor-pointer"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/18 bg-white/[0.09] text-[#EAEEDB]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-white/14 bg-white/[0.06] px-3 py-1 text-[10.5px] font-medium text-[#E0DDD0]">
                        {srv.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-sans text-[17px] sm:text-[18px] font-bold tracking-tight leading-snug text-[#FAF8F2]">
                        {srv.title}
                      </h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#C7C3B4]">
                        {srv.desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-xs font-semibold text-[#E8ECDA]">
                    <span>Request this ritual</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full frost-cta-white transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tier 2: On-Demand Amenities Ledger */}
      {amenityServices.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-sans text-[17px] sm:text-xl font-bold tracking-tight text-[#FAF8F2]">
              Amenities &amp; Essentials
            </h2>
            <span className="text-[11px] font-medium text-[#B9B5A5]">Direct to room</span>
          </div>

          <div className="gsap-rs-card overflow-hidden rounded-[24px] border border-white/14 bg-[#1D2016] divide-y divide-white/10 shadow-[0_14px_30px_-16px_rgba(0,0,0,0.55)]">
            {amenityServices.map((srv) => {
              const Icon = srv.icon;
              return (
                <button
                  key={srv.type}
                  type="button"
                  onClick={() => onSelectService(srv)}
                  className="group flex w-full items-center justify-between gap-3.5 px-4 py-4 sm:px-5 text-left transition-colors hover:bg-white/[0.045] active:bg-white/[0.07] cursor-pointer"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/16 bg-white/[0.08] text-[#EAEEDB]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-sans text-[14.5px] sm:text-[15px] font-semibold text-[#FAF8F2]">
                          {srv.title}
                        </h3>
                        <span className="hidden sm:inline-flex rounded-full border border-white/14 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#C8C4B6]">
                          {srv.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] leading-snug text-[#BDB9AA] line-clamp-2">
                        {srv.desc}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full frost-pill-chip px-3 py-1.5 text-[11px] font-semibold text-[#FAF8F2] transition-colors group-hover:bg-white group-hover:text-[#171714]">
                    <span>Request</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
