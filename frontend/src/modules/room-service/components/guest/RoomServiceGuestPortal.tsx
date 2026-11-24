import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { ROOM_SERVICE_CATALOG } from "../../catalog";
import { useRoomServiceAdapter } from "../../adapter";
import type { HousekeepingRequest, RoomServiceCatalogItem } from "../../types";
import { RoomServiceCatalogGrid } from "./RoomServiceCatalogGrid";
import { RoomServiceRequestsList } from "./RoomServiceRequestsList";
import { RoomServiceRequestModal } from "./RoomServiceRequestModal";

export interface RoomServiceGuestPortalProps {
  roomNumber?: string;
  guestName?: string;
  requests?: HousekeepingRequest[];
  onRequestsChange?: React.Dispatch<React.SetStateAction<HousekeepingRequest[]>>;
  onBackToHub?: () => void;
  catalog?: RoomServiceCatalogItem[];
}

export function RoomServiceGuestPortal({
  roomNumber,
  guestName,
  requests: controlledRequests,
  onRequestsChange,
  onBackToHub,
  catalog = ROOM_SERVICE_CATALOG,
}: RoomServiceGuestPortalProps) {
  const { api, realtime } = useRoomServiceAdapter();
  const [internalRequests, setInternalRequests] = useState<HousekeepingRequest[]>([]);
  const requests = controlledRequests ?? internalRequests;
  const setRequests = onRequestsChange ?? setInternalRequests;

  const [selectedService, setSelectedService] = useState<RoomServiceCatalogItem | null>(null);
  const [guestNote, setGuestNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.getGuestHousekeepingRequests();
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error("[RoomService] Fetch error:", err);
    }
  }, [api, setRequests]);

  useEffect(() => {
    if (controlledRequests !== undefined) return;
    fetchRequests();
    const unsubCreated = realtime.onHousekeepingCreated((req) => {
      setRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
    });
    const unsubStatus = realtime.onHousekeepingStatusChanged((data) => {
      const updated = data.request;
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    });
    return () => {
      unsubCreated();
      unsubStatus();
    };
  }, [controlledRequests, fetchRequests, realtime, setRequests]);

  const handleConfirmRequest = async () => {
    if (!selectedService || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.createGuestHousekeepingRequest({
        requestType: selectedService.type,
        guestNote: guestNote.trim() || undefined,
      });
      if (res.success) {
        setRequests((prev) => [res.request, ...prev.filter((r) => r.id !== res.request.id)]);
        setSelectedService(null);
        setGuestNote("");
        setFeedback({
          type: "success",
          message: `Your request for "${res.request.title}" has been placed. Our housekeeping team will attend to Suite ${roomNumber || ""} shortly.`,
        });
        setTimeout(() => {
          setFeedback(null);
        }, 6000);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Unable to submit request. Please try again or contact Reception.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {onBackToHub && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[rgba(20,18,16,0.12)] bg-white px-2.5 text-xs font-medium text-[#141210] transition-colors hover:border-[rgba(20,18,16,0.26)] btn-smooth-press-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-[#5C554E]" strokeWidth={1.5} />
            <span>All Services</span>
          </button>
          <span className="text-xs text-[#5C554E] tabular-nums">
            Suite <strong className="font-medium text-[#141210]">{roomNumber}</strong>
          </span>
        </div>
      )}

      {/* Editorial Header */}
      <section className="rounded-xl border border-[rgba(20,18,16,0.1)] bg-white p-5 sm:p-7">
        <div className="max-w-xl space-y-2">
          <h1 className="font-serif text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#141210] sm:text-[36px]">
            Suite Care & Replenishment
          </h1>
          <p className="text-[13px] leading-relaxed text-[#5C554E]">
            Request housekeeping, linen refresh, bath amenities, or luggage assistance directly to Suite {roomNumber}.
          </p>
        </div>
      </section>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-xs animate-in fade-in ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={1.5} />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" strokeWidth={1.5} />
          )}
          <span className="leading-relaxed">{feedback.message}</span>
        </div>
      )}

      <RoomServiceCatalogGrid services={catalog} onSelectService={setSelectedService} />

      <RoomServiceRequestsList requests={requests} />

      <RoomServiceRequestModal
        service={selectedService}
        roomNumber={roomNumber}
        guestName={guestName}
        guestNote={guestNote}
        onGuestNoteChange={setGuestNote}
        isSubmitting={isSubmitting}
        onClose={() => {
          setSelectedService(null);
          setGuestNote("");
        }}
        onConfirm={handleConfirmRequest}
      />
    </div>
  );
}
