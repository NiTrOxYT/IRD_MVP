import React from "react";
import { ArrowRight } from "lucide-react";
import { Tilt3DCard } from "../../../../core/ui/MotionPrimitives";
import type { RoomServiceCatalogItem } from "../../types";

interface RoomServiceCatalogGridProps {
  services: RoomServiceCatalogItem[];
  onSelectService: (service: RoomServiceCatalogItem) => void;
}

export function RoomServiceCatalogGrid({ services, onSelectService }: RoomServiceCatalogGridProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-serif text-xl font-semibold tracking-[-0.01em] text-[#141210]">
        Available Services
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((srv) => {
          const Icon = srv.icon;
          return (
            <Tilt3DCard
              key={srv.type}
              onClick={() => onSelectService(srv)}
              maxTilt={3.5}
              className="cursor-pointer"
              surfaceClassName="group flex h-full flex-col justify-between rounded-xl border border-[rgba(20,18,16,0.1)] bg-white p-4 text-left hover:border-[rgba(20,18,16,0.28)]"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Icon
                    className="h-[18px] w-[18px] text-[#5C554E] transition-colors group-hover:text-[#141210]"
                    strokeWidth={1.4}
                  />
                  <span className="rounded-md border border-[rgba(20,18,16,0.09)] bg-[#F6F4EF] px-2 py-0.5 text-[10px] font-medium text-[#5C554E]">
                    {srv.badge}
                  </span>
                </div>
                <h3 className="font-serif text-[17px] font-semibold leading-snug text-[#141210] transition-colors group-hover:text-[#966F29]">
                  {srv.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5C554E]">
                  {srv.desc}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[rgba(20,18,16,0.07)] pt-2.5 text-xs font-medium text-[#141210]">
                <span>Request</span>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[#847C73] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#141210]"
                  strokeWidth={1.5}
                />
              </div>
            </Tilt3DCard>
          );
        })}
      </div>
    </div>
  );
}
