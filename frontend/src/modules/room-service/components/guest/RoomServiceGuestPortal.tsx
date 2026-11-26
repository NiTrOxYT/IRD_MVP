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
    <div ref={rsRootRef} className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-6">
      {onBackToHub && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#C8A262]/30 bg-[#1F1C18] px-3.5 py-1.5 text-xs font-semibold text-[#F6F1E9] hover:border-[#C8A262]/60 btn-smooth-press-sm cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-[#D8B472]" />
            <span>All Services</span>
          </button>
          <span className="rounded-full border border-white/12 bg-[#1D1A16] px-3 py-1 text-[11px] font-medium text-[#D6CEC2] tabular-nums">
            Suite <strong className="text-[#F8F4EC]">{roomNumber}</strong>
          </span>
        </div>
      )}

      {/* Editorial Sanctuary Hero Card */}
      <section
        ref={heroRef}
        className="relative overflow-hidden rounded-[28px] border border-[#C8A262]/24 bg-[#181613] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.65)]"
      >
        <div className="relative h-[200px] sm:h-[238px] w-full overflow-hidden">
          <img
            src={heroImageUrl || "/room-service-card.jpg"}
            alt="Room Service & Suite Care"
            className="gsap-rs-hero-img h-full w-full scale-105 object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(24,22,19,0.12)_0%,rgba(24,22,19,0.68)_65%,rgba(24,22,19,1)_100%)]"
          />
        </div>

        <div className="relative z-10 -mt-8 px-5 pb-6 sm:px-7 sm:pb-7 space-y-3.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-serif text-[26px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-[1.08] text-[#FAF6EE]">
              Suite Care & Concierge
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C8A262]/35 bg-[#26211A] px-3 py-1 text-[11px] font-medium text-[#E5C58B]">
              <Sparkles className="h-3 w-3" />
              Complimentary
            </span>
          </div>

          <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#BEB6AA] max-w-[54ch]">
            Select any housekeeping ritual or in-suite amenity below. Requests dispatch directly to our butler desk for Suite {roomNumber}.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-[#D8CEC0]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
              <Clock className="h-3 w-3 text-[#D8B472]" />
              24/7 Butler Dispatch
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
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
