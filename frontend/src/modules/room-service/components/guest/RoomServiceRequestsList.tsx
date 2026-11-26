import React, { useRef } from "react";
import { CheckCircle2, Clock, LoaderCircle } from "lucide-react";
import { SuiteCareBellIcon } from "../../../../core/ui/CustomResortIcons";
import { setupScrollBatchCards, useGSAP } from "../../../../core/ui/gsap";
import type { HousekeepingRequest } from "../../types";

interface RoomServiceRequestsListProps {
  requests: HousekeepingRequest[];
}

export function RoomServiceRequestsList({ requests }: RoomServiceRequestsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!listRef.current) return;
      setupScrollBatchCards(listRef.current, ".gsap-rs-req-card", { stagger: 0.035, y: 10, start: "top 95%" });
    },
    { scope: listRef, dependencies: [requests.length] }
  );

  return (
    <section ref={listRef} className="pt-2 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-[#FAF6EE] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#D8B472]" />
          <span>Request Log</span>
        </h2>
        {requests.length > 0 && (
          <span className="text-[11px] font-medium text-[#A99F92] tabular-nums">
            {requests.length} request{requests.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="gsap-rs-req-card rounded-[24px] border border-white/10 bg-[#1B1815] p-7 text-center">
          <SuiteCareBellIcon className="w-7 h-7 text-[#D8B472]/60 mx-auto mb-2.5" />
          <p className="text-xs font-semibold text-[#FAF6EE]">No housekeeping requests placed yet</p>
          <p className="text-[11.5px] text-[#A79E92] mt-1">
            Select a ritual or amenity above to request immediate butler care.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="gsap-rs-req-card rounded-[24px] border border-white/10 bg-[#1B1815] p-4.5 shadow-[0_12px_28px_-16px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <span className="text-[11px] font-medium text-[#A79E92] block tabular-nums">
                    Suite {req.room_number} · #{req.id}
                  </span>
                  <h3 className="font-sans text-[15px] font-semibold text-[#FAF6EE] mt-0.5">
                    {req.title}
                  </h3>
                </div>
                <div>
                  {req.status === "pending" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-amber-500/15 text-amber-200 border border-amber-400/25">
                      <Clock className="w-3 h-3" /> Received
                    </span>
                  )}
                  {req.status === "accepted" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-sky-500/15 text-sky-200 border border-sky-400/25">
                      <CheckCircle2 className="w-3 h-3" /> Accepted
                    </span>
                  )}
                  {req.status === "in_progress" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#C8A262]/18 text-[#F2D399] border border-[#C8A262]/35">
                      <LoaderCircle className="w-3 h-3 animate-spin" /> In Progress
                    </span>
                  )}
                  {req.status === "completed" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-200 border border-emerald-400/25">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  )}
                  {req.status === "declined" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-rose-500/15 text-rose-200 border border-rose-400/25">
                      Declined
                    </span>
                  )}
                </div>
              </div>

              {req.guest_note && (
                <p className="text-[11.5px] text-[#DED6CA] italic bg-[#141210] border border-white/8 p-2.5 rounded-xl mb-2">
                  "{req.guest_note}"
                </p>
              )}

              {req.staff_notes && (
                <p className="text-[11.5px] text-[#FAF6EE] bg-[#25211C] border border-[#C8A262]/25 p-2.5 rounded-xl mb-2">
                  <strong>Staff Note:</strong> {req.staff_notes}
                </p>
              )}

              <div className="flex items-center justify-between text-[10.5px] text-[#9E9589] pt-2.5 border-t border-white/8 tabular-nums">
                <span>
                  Requested at{" "}
                  {new Date(req.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {req.completed_at && (
                  <span className="text-emerald-300 font-medium">
                    Completed at{" "}
                    {new Date(req.completed_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
