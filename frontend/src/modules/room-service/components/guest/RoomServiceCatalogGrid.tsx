import React, { useRef } from "react";
import { SuiteCareBellIcon } from "../../../../core/ui/CustomResortIcons";
import { setupScrollBatchCards, useGSAP } from "../../../../core/ui/gsap";
import { Tilt3DCard } from "../../../../core/ui/MotionPrimitives";
import type { RoomServiceCatalogItem } from "../../types";

interface RoomServiceCatalogGridProps {
  services: RoomServiceCatalogItem[];
  onSelectService: (service: RoomServiceCatalogItem) => void;
}

export function RoomServiceCatalogGrid({ services, onSelectService }: RoomServiceCatalogGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!gridRef.current) return;
      setupScrollBatchCards(gridRef.current, ".gsap-rs-card", { stagger: 0.035, y: 12, start: "top 95%" });
    },
    { scope: gridRef, dependencies: [services.length] }
  );

  return (
    <div ref={gridRef}>
      <h3 className="font-sans text-lg font-bold text-white mb-3.5 flex items-center gap-2 px-1">
        <SuiteCareBellIcon className="w-4 h-4 text-white/85" /> Request a Service
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {services.map((srv) => {
          const Icon = srv.icon;
          return (
            <Tilt3DCard
              key={srv.type}
              onClick={() => onSelectService(srv)}
              maxTilt={4.5}
              className="gsap-rs-card cursor-pointer"
              surfaceClassName="group h-full frost-component-card rounded-[28px] p-4.5 flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-full frost-pill-chip text-white flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-white/90 frost-pill-chip px-2.5 py-0.5 rounded-full">
                    {srv.badge}
                  </span>
                </div>
                <h4 className="font-sans text-[15px] font-bold text-white leading-snug">
                  {srv.title}
                </h4>
                <p className="text-[11.5px] text-white/75 mt-1.5 line-clamp-2 leading-relaxed">
                  {srv.desc}
                </p>
              </div>
              <div className="mt-4 pt-1">
                <div className="flex w-full items-center justify-center rounded-full frost-cta-white py-2.5 text-[11.5px] font-bold">
                  Request Service
                </div>
              </div>
            </Tilt3DCard>
          );
        })}
      </div>
    </div>
  );
}
