import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, Clock, Sparkles } from "lucide-react";
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
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.36, ease: "power2.out", force3D: true, clearProps: "transform" }
        );
      });
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        if (!heroRef.current) return;
        gsap.to(".gsap-rs-hero-img", {
          yPercent: 10,
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
          message: `Your request for "${res.request.title}" has been placed. Our butler team will attend to Suite ${roomNumber || ""} shortly.`,
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
    <div ref={rsRootRef} className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-6 font-sans">
      {onBackToHub && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex items-center gap-1 rounded-full frost-cta-white px-3.5 py-1.5 text-xs font-bold btn-smooth-press-sm cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>All Services</span>
          </button>
          <span className="rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold text-white/90 tabular-nums">
            Suite <strong className="text-white">{roomNumber}</strong>
          </span>
        </div>
      )}

      {/* Olive-Charcoal Sanctuary Hero Card matching app palette & typography */}
      <section
        ref={heroRef}
        className="relative overflow-hidden rounded-[28px] border border-white/16 bg-[#1C1E16] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.65)]"
      >
        <div className="relative h-[200px] sm:h-[238px] w-full overflow-hidden">
          <img
            src={heroImageUrl || "/room-service-card.jpg"}
            alt="Room Service & Suite Care"
            className="gsap-rs-hero-img h-full w-full scale-105 object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(24,26,18,0.12)_0%,rgba(26,28,20,0.7)_65%,#1C1E16_100%)]"
          />
        </div>

        <div className="relative z-10 -mt-8 px-5 pb-6 sm:px-7 sm:pb-7 space-y-3.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-sans text-[26px] sm:text-[34px] font-bold tracking-tight leading-[1.08] text-[#FAF8F2]">
              Suite Care &amp; Concierge
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full frost-pill-chip px-3 py-1 text-[11px] font-semibold text-[#E8ECDA]">
              <Sparkles className="h-3 w-3 text-[#C5CE9F]" />
              Complimentary
            </span>
          </div>

          <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#D2CEBE] max-w-[54ch]">
            Select any housekeeping ritual or in-suite amenity below. Requests dispatch directly to our butler desk for Suite {roomNumber}.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-[#E6E2D4]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.06] px-3 py-1">
              <Clock className="h-3 w-3 text-[#C5CE9F]" />
              24/7 Butler Dispatch
            </span>
            <span className="rounded-full border border-white/14 bg-white/[0.06] px-3 py-1">
              10–15 min arrival
            </span>
          </div>
        </div>
      </section>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-[22px] border text-xs flex items-start gap-3 zomato-cart-enter ${
            feedback.type === "success"
              ? "bg-emerald-950/75 border-emerald-400/35 text-emerald-100"
              : "bg-rose-950/75 border-rose-400/35 text-rose-100"
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
