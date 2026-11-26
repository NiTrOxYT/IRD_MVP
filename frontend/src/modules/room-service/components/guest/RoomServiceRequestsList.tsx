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
      setupScrollBatchCards(listRef.current, ".gsap-rs-req-card", { stagger: 0.06, y: 20, start: "top 94%" });
    },
    { scope: listRef, dependencies: [requests.length], revertOnUpdate: true }
  );

  return (
    <div ref={listRef} className="pt-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-white/85" /> Current & Recent Requests
        </h3>
        {requests.length > 0 && (
          <span className="text-[11px] text-white/70 tabular-nums">
            {requests.length} request{requests.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="gsap-rs-req-card frost-component-card rounded-[28px] p-8 text-center">
          <SuiteCareBellIcon className="w-8 h-8 text-white/45 mx-auto mb-2" />
          <p className="text-xs font-semibold text-white">No housekeeping requests placed yet</p>
          <p className="text-[11px] text-white/65 mt-0.5">
            Select a service above to request amenities or in-suite care.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="gsap-rs-req-card frost-component-card rounded-[26px] p-4.5"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/65 block tabular-nums">
                    Suite {req.room_number} · #{req.id}
                  </span>
                  <h4 className="font-sans text-sm font-bold text-white">{req.title}</h4>
                </div>
                <div>
                  {req.status === "pending" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-100 border border-amber-300/35">
                      <Clock className="w-3 h-3" /> Received
                    </span>
                  )}
                  {req.status === "accepted" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-400/20 text-sky-100 border border-sky-300/35">
                      <CheckCircle2 className="w-3 h-3" /> Accepted
                    </span>
                  )}
                  {req.status === "in_progress" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-400/20 text-indigo-100 border border-indigo-300/35">
                      <LoaderCircle className="w-3 h-3 animate-spin" /> In Progress
                    </span>
                  )}
                  {req.status === "completed" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-100 border border-emerald-300/35">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  )}
                  {req.status === "declined" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-100 border border-rose-300/35">
                      Declined
                    </span>
                  )}
                </div>
              </div>

              {req.guest_note && (
                <p className="text-[11px] text-white/80 italic bg-black/22 border border-white/12 p-2.5 rounded-xl mb-2">
                  "{req.guest_note}"
                </p>
              )}

              {req.staff_notes && (
                <p className="text-[11px] text-white bg-white/14 border border-white/20 p-2.5 rounded-xl mb-2">
                  <strong>Staff Note:</strong> {req.staff_notes}
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-white/65 pt-2 border-t border-white/14 tabular-nums">
                <span>
                  Requested at{" "}
                  {new Date(req.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {req.completed_at && (
                  <span className="text-emerald-300 font-semibold">
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
    </div>
  );
}
