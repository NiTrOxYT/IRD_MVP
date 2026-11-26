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
    <div ref={gridRef} className="space-y-6">
      {/* Tier 1: Signature Butler Rituals */}
      {signatureServices.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-[#FAF6EE] flex items-center gap-2">
              <SuiteCareBellIcon className="h-4 w-4 text-[#D8B472]" />
              <span>Signature Suite Rituals</span>
            </h2>
            <span className="text-[11px] font-medium text-[#A99F92]">Tap to schedule</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {signatureServices.map((srv) => {
              const Icon = srv.icon;
              return (
                <button
                  key={srv.type}
                  type="button"
                  onClick={() => onSelectService(srv)}
                  className="gsap-rs-card group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#C8A262]/28 bg-[linear-gradient(155deg,#24201A_0%,#181512_100%)] p-5 text-left shadow-[0_16px_34px_-16px_rgba(0,0,0,0.65)] transition-colors hover:border-[#C8A262]/60 cursor-pointer"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C8A262]/30 bg-[#2C261F] text-[#E5C58B]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[10.5px] font-medium text-[#D6CEC2]">
                        {srv.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-[19px] font-semibold leading-snug text-[#FAF6EE]">
                        {srv.title}
                      </h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#B5ACA0]">
                        {srv.desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3.5 text-xs font-semibold text-[#E5C58B]">
                    <span>Request this ritual</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F6F1E9] text-[#181512] transition-transform duration-200 group-hover:translate-x-0.5">
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
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-[#FAF6EE]">
              Amenities & Essentials
            </h2>
            <span className="text-[11px] font-medium text-[#A99F92]">Direct to room</span>
          </div>

          <div className="gsap-rs-card overflow-hidden rounded-[24px] border border-white/10 bg-[#1B1815] divide-y divide-white/8 shadow-[0_14px_30px_-16px_rgba(0,0,0,0.55)]">
            {amenityServices.map((srv) => {
              const Icon = srv.icon;
              return (
                <button
                  key={srv.type}
                  type="button"
                  onClick={() => onSelectService(srv)}
                  className="group flex w-full items-center justify-between gap-3.5 px-4 py-4 sm:px-5 text-left transition-colors hover:bg-white/[0.035] active:bg-white/[0.05] cursor-pointer"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#C8A262]/25 bg-[#25211C] text-[#E5C58B]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-sans text-[14.5px] sm:text-[15px] font-semibold text-[#FAF6EE]">
                          {srv.title}
                        </h3>
                        <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#B8AFA3]">
                          {srv.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] leading-snug text-[#A79E92] line-clamp-2">
                        {srv.desc}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#C8A262]/30 bg-[#26211B] px-3 py-1.5 text-[11px] font-semibold text-[#E5C58B] transition-colors group-hover:bg-[#F6F1E9] group-hover:text-[#181512]">
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
