import React from "react";
import { Clock } from "lucide-react";
import type { HousekeepingRequest } from "../../types";
import { ArchSuiteCareIcon } from "../../../../core/ui/EnterpriseIcons";

interface RoomServiceRequestsListProps {
  requests: HousekeepingRequest[];
}

const REQUEST_STATUS_STYLE: Record<string, { label: string; style: string }> = {
  pending: { label: "Received", style: "border-amber-300/70 bg-amber-50 text-amber-900" },
  accepted: { label: "Confirmed", style: "border-sky-300/70 bg-sky-50 text-sky-900" },
  in_progress: { label: "In Progress", style: "border-indigo-300/70 bg-indigo-50 text-indigo-900" },
  completed: { label: "Completed", style: "border-emerald-300/70 bg-emerald-50 text-emerald-900" },
  declined: { label: "Declined", style: "border-rose-300/70 bg-rose-50 text-rose-900" },
};

export function RoomServiceRequestsList({ requests }: RoomServiceRequestsListProps) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold tracking-[-0.01em] text-[#141210]">
          Active & Recent Requests
        </h2>
        {requests.length > 0 && (
          <span className="text-xs text-[#5C554E] tabular-nums">
            {requests.length} {requests.length === 1 ? "request" : "requests"}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-[rgba(20,18,16,0.09)] bg-white p-8 text-center">
          <ArchSuiteCareIcon className="mx-auto mb-2.5 h-6 w-6 text-[#847C73]" strokeWidth={1.3} />
          <p className="text-sm font-medium text-[#141210]">No active suite care requests</p>
          <p className="mt-1 text-xs text-[#5C554E]">
            Select any service above to notify our housekeeping desk.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requests.map((req) => {
            const st = REQUEST_STATUS_STYLE[req.status] || {
              label: req.status,
              style: "border-[rgba(20,18,16,0.12)] bg-[#F6F4EF] text-[#5C554E]",
            };

            return (
              <div
                key={req.id}
                className="rounded-xl border border-[rgba(20,18,16,0.09)] bg-white p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <span className="block text-[11px] text-[#847C73] tabular-nums">
                      Suite {req.room_number} · #{req.id}
                    </span>
                    <h3 className="font-serif text-base font-semibold text-[#141210]">
                      {req.title}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${st.style}`}
                  >
                    {st.label}
                  </span>
                </div>

                {req.guest_note && (
                  <p className="mb-2 rounded-lg border border-[rgba(20,18,16,0.08)] bg-[#F6F4EF] px-3 py-2 text-xs text-[#5C554E]">
                    {req.guest_note}
                  </p>
                )}

                {req.staff_notes && (
                  <p className="mb-2 rounded-lg border border-[#E2D4B7] bg-[#FBF8F1] px-3 py-2 text-xs text-[#141210]">
                    <span className="font-medium text-[#966F29]">Desk note:</span> {req.staff_notes}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-[rgba(20,18,16,0.07)] pt-2 text-[11px] text-[#847C73] tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" strokeWidth={1.4} />
                    Placed{" "}
                    {new Date(req.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {req.completed_at && (
                    <span className="font-medium text-emerald-700">
                      Completed{" "}
                      {new Date(req.completed_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
