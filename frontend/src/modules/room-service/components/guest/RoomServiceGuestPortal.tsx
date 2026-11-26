import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { gsap, useGSAP } from "../../../../core/ui/gsap";
import { ROOM_SERVICE_CATALOG } from "../../catalog";
import { useRoomServiceAdapter } from "../../adapter";
import type { HousekeepingRequest, RoomServiceCatalogItem } from "../../types";
import { RoomServiceCatalogGrid } from "./RoomServiceCatalogGrid";
import { RoomServiceRequestsList } from "./RoomServiceRequestsList";
import { RoomServiceRequestModal } from "./RoomServiceRequestModal";

export interface RoomServiceGuestPortalProps {
  roomNumber?: string;
  guestName?: string;
  heroImageUrl?: string | null;
  requests?: HousekeepingRequest[];
  onRequestsChange?: React.Dispatch<React.SetStateAction<HousekeepingRequest[]>>;
  onBackToHub?: () => void;
  catalog?: RoomServiceCatalogItem[];
}

export function RoomServiceGuestPortal({
  roomNumber,
  guestName,
  heroImageUrl,
  requests: controlledRequests,
  onRequestsChange,
  onBackToHub,
  catalog = ROOM_SERVICE_CATALOG,
}: RoomServiceGuestPortalProps) {
  const { api, realtime } = useRoomServiceAdapter();
  const rsRootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
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

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!heroRef.current) return;
        gsap.fromTo(
          heroRef.current,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.36, ease: "power2.out", force3D: true, clearProps: "transform" }
        );
      });
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        if (!heroRef.current) return;
        gsap.to(".gsap-rs-hero-img", {
          yPercent: 12,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      });
    },
    { scope: rsRootRef }
  );

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
    <div ref={rsRootRef} className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-5 sm:space-y-6">
      {onBackToHub && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full frost-cta-white btn-smooth-press-sm"
          >
            <ChevronLeft size={16} /> All Services
          </button>
          <div className="text-[11px] text-white/75 tabular-nums frost-pill-chip px-3 py-1 rounded-full">
            Suite <strong className="text-white">{roomNumber}</strong>
          </div>
        </div>
      )}

      {/* Reference 2 Frosted Component Hero Card */}
      <div ref={heroRef} className="relative overflow-hidden rounded-[32px] frost-component-card">
        <div className="relative h-[196px] sm:h-[230px] w-full overflow-hidden">
          <img
            src={heroImageUrl || "/room-service-card.jpg"}
            alt="Room Service & Suite Care"
            className="gsap-rs-hero-img h-full w-full scale-105 object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 frost-component-fade" />
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
        </div>

        <div className="relative z-10 -mt-3 space-y-3 px-5 pb-6 sm:px-7 sm:pb-7">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-sans text-[22px] sm:text-[28px] font-bold tracking-tight text-white leading-tight">
              Room Service & Suite Care
            </h2>
            <span className="shrink-0 rounded-full frost-pill-chip px-3 py-1 text-xs font-bold text-white">
              Complimentary
            </span>
          </div>
          <p className="text-[12.5px] sm:text-[13.5px] text-white/75 leading-relaxed max-w-[54ch]">
            Select an item below to place a request. Our housekeeping and butler team will attend Suite {roomNumber} promptly.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold">
              Direct Dispatch
            </span>
            <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold">
              24/7 Care
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-[22px] border text-xs flex items-start gap-3 zomato-cart-enter ${
            feedback.type === "success"
              ? "bg-emerald-500/20 border-emerald-300/35 text-emerald-100"
              : "bg-rose-500/20 border-rose-300/35 text-rose-100"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
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
