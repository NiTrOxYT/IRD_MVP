import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { gsap, useGSAP } from "../../../../core/ui/gsap";
import { useIrdAdapter } from "../../adapter";

export interface ConfirmedOrderSummary {
  orderNumber: string;
  roomNumber: string;
  itemCount: number;
  totalAmount: number;
  prepMinutes: number;
}

interface OrderConfirmedOverlayProps {
  order: ConfirmedOrderSummary | null;
  onDone: () => void;
}

const BURST_PARTICLES = Array.from({ length: 12 }, (_, idx) => {
  const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
  const dist = idx % 2 === 0 ? 74 : 56;
  return {
    id: idx,
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist),
    rot: (idx % 2 === 0 ? 1 : -1) * 45,
    color: idx % 3 === 0 ? "#E9C77D" : idx % 3 === 1 ? "#CD5B34" : "#FFF3DE",
    size: idx % 2 === 0 ? 7 : 5,
  };
});

export function OrderConfirmedOverlay({ order, onDone }: OrderConfirmedOverlayProps) {
  const { formatPrice } = useIrdAdapter();
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const closingRef = useRef(false);

  const visible = Boolean(order);

  const particles = useMemo(() => BURST_PARTICLES, []);

  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  const { contextSafe } = useGSAP(
    () => {
      if (!order || !rootRef.current) return;
      closingRef.current = false;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(rootRef.current, { autoAlpha: 0, force3D: true });
        gsap.set(".gsap-oc-halo", { scale: 0.65, autoAlpha: 0, force3D: true });
        gsap.set(".gsap-oc-cloche", { y: 18, scale: 0.84, autoAlpha: 0, force3D: true });
        gsap.set(".gsap-oc-cloche-dome", { y: -10, force3D: true });
        gsap.set(".gsap-oc-badge", { scale: 0, rotation: -20, autoAlpha: 0, force3D: true });
        gsap.set(".gsap-oc-check", { strokeDashoffset: 36 });
        gsap.set(".gsap-oc-copy", { y: 14, autoAlpha: 0, force3D: true });
        gsap.set(".gsap-oc-spark", { x: 0, y: 0, scale: 0, autoAlpha: 0, force3D: true });
        gsap.set(".gsap-oc-progress", { scaleX: 0, transformOrigin: "left center", force3D: true });

        const tl = gsap.timeline({
          defaults: { force3D: true },
        });
        timelineRef.current = tl;

        tl.to(rootRef.current, {
          autoAlpha: 1,
          duration: 0.32,
          ease: "power2.out",
        })
          .to(
            ".gsap-oc-halo",
            {
              scale: 1,
              autoAlpha: 1,
              duration: 0.55,
              ease: "power3.out",
            },
            0.08
          )
          .to(
            ".gsap-oc-cloche",
            {
              y: 0,
              scale: 1,
              autoAlpha: 1,
              duration: 0.45,
              ease: "back.out(1.6)",
            },
            0.12
          )
          .to(
            ".gsap-oc-cloche-dome",
            {
              y: 0,
              duration: 0.36,
              ease: "bounce.out",
            },
            0.34
          )
          .to(
            ".gsap-oc-badge",
            {
              scale: 1,
              rotation: 0,
              autoAlpha: 1,
              duration: 0.34,
              ease: "back.out(2.2)",
            },
            0.36
          )
          .to(
            ".gsap-oc-check",
            {
              strokeDashoffset: 0,
              duration: 0.32,
              ease: "power2.out",
            },
            0.46
          )
          // GPU radial ember burst when cloche settles
          .to(
            ".gsap-oc-spark",
            {
              x: (idx: number) => particles[idx]?.tx ?? 0,
              y: (idx: number) => particles[idx]?.ty ?? 0,
              rotation: (idx: number) => particles[idx]?.rot ?? 0,
              scale: 1,
              autoAlpha: 0.95,
              duration: 0.42,
              stagger: { amount: 0.08, from: "start" },
              ease: "power3.out",
            },
            0.42
          )
          .to(
            ".gsap-oc-spark",
            {
              scale: 0.3,
              autoAlpha: 0,
              duration: 0.35,
              ease: "power2.in",
            },
            0.78
          )
          .to(
            ".gsap-oc-copy",
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.4,
              stagger: 0.065,
              ease: "power3.out",
              clearProps: "transform",
            },
            0.44
          )
          .to(
            ".gsap-oc-progress",
            {
              scaleX: 1,
              duration: 2.35,
              ease: "none",
            },
            0.7
          )
          .call(() => {
            if (closingRef.current) return;
            closingRef.current = true;
            gsap.to(rootRef.current, {
              autoAlpha: 0,
              scale: 0.985,
              duration: 0.28,
              ease: "power2.in",
              onComplete: onDone,
            });
          });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(rootRef.current, { autoAlpha: 1 });
        gsap.set([".gsap-oc-halo", ".gsap-oc-cloche", ".gsap-oc-badge", ".gsap-oc-copy"], {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          rotation: 0,
        });
        gsap.set(".gsap-oc-check", { strokeDashoffset: 0 });
        gsap.set(".gsap-oc-progress", { scaleX: 1, transformOrigin: "left center" });

        const timer = window.setTimeout(() => {
          if (!closingRef.current) {
            closingRef.current = true;
            onDone();
          }
        }, 2200);
        return () => window.clearTimeout(timer);
      });

      return () => {
        timelineRef.current?.kill();
        mm.revert();
      };
    },
    { scope: rootRef, dependencies: [order?.orderNumber], revertOnUpdate: true }
  );

  const handleDismiss = contextSafe(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    timelineRef.current?.kill();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !rootRef.current) {
      onDone();
      return;
    }

    gsap.to(rootRef.current, {
      autoAlpha: 0,
      y: -10,
      duration: 0.24,
      ease: "power2.in",
      force3D: true,
      onComplete: onDone,
    });
  });

  if (!visible || !order || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Order Confirmed"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-[#190C07] px-6 py-10 text-center text-[#FFF9EF]"
    >
      {/* Warm Terracotta & Espresso Radial Scrim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(196,77,39,0.34)_0%,rgba(61,24,14,0.65)_42%,rgba(20,9,5,0.98)_82%)]"
      />

      <div className="relative z-10 flex w-full max-w-[380px] flex-col items-center">
        {/* Animated Cloche Platter & Check Emblem */}
        <div className="relative mb-7 flex h-28 w-28 items-center justify-center">
          <div
            aria-hidden="true"
            className="gsap-oc-halo absolute inset-0 rounded-full border border-[#E9C77D]/30 bg-[#C44D27]/14 shadow-[0_0_50px_-6px_rgba(196,77,39,0.5)]"
          />

          {/* Radial Ember Sparks */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {particles.map((p) => (
              <span
                key={p.id}
                className="gsap-oc-spark absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
              />
            ))}
          </div>

          {/* Sculpted Cloche SVG */}
          <svg
            viewBox="0 0 88 88"
            className="gsap-oc-cloche relative h-20 w-20 drop-shadow-[0_12px_20px_rgba(10,4,2,0.6)]"
            aria-hidden="true"
          >
            <g className="gsap-oc-cloche-dome">
              {/* Top knob */}
              <circle cx="44" cy="21" r="3.5" fill="#E9C77D" />
              {/* Dome */}
              <path
                d="M17 55 C17 37, 29 25, 44 25 C59 25, 71 37, 71 55 Z"
                fill="#FFF8EE"
                stroke="#E9C77D"
                strokeWidth="2"
              />
              {/* Subtle specular highlight */}
              <path
                d="M25 50 C26 39, 33 32, 41 30"
                fill="none"
                stroke="#C44D27"
                strokeOpacity="0.28"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
            {/* Platter rim */}
            <path
              d="M10 56 H78 L73 62 H15 Z"
              fill="#E9C77D"
            />
          </svg>

          {/* Animated Terracotta Check Badge */}
          <div
            aria-hidden="true"
            className="gsap-oc-badge absolute -bottom-0.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#190C07] bg-[#C44D27] shadow-md"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
              <path
                d="M5 12.5 L10 17.5 L19.5 7.5"
                fill="none"
                stroke="#FFFBF6"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="36"
                className="gsap-oc-check"
              />
            </svg>
          </div>
        </div>

        {/* Editorial Headline */}
        <h2 className="gsap-oc-copy font-serif text-[32px] sm:text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#FFF9EF]">
          Order Sent to Kitchen
        </h2>

        <p
          className="gsap-oc-copy mt-2 text-[20px] sm:text-[22px] font-medium italic text-[#E9C77D]"
          style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
        >
          Freshly plated for Suite {order.roomNumber}
        </p>

        {/* Clean Hairline Order Summary */}
        <div className="gsap-oc-copy mt-6 w-full border-y border-[#E2C98F]/20 py-4 space-y-2.5 text-[13px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#EADDCB]/72">Kitchen Ticket</span>
            <span className="font-mono font-bold text-[#FFF9EF] tabular-nums">{order.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#EADDCB]/72">Selection</span>
            <span className="font-semibold text-[#FFF9EF] tabular-nums">
              {order.itemCount} {order.itemCount === 1 ? "dish" : "dishes"} · ~{order.prepMinutes} mins
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#EADDCB]/72">Total to Folio</span>
            <span className="font-sans text-[15px] font-extrabold text-[#FFF9EF] tabular-nums">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Auto-transition progress trace */}
        <div className="gsap-oc-copy mt-6 flex flex-col items-center gap-4 w-full">
          <div className="h-[2px] w-36 overflow-hidden rounded-full bg-[#E2C98F]/20" aria-hidden="true">
            <div className="gsap-oc-progress h-full w-full rounded-full bg-[#E9C77D]" />
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 rounded-full bg-[#FFFBF6] px-6 py-3 text-xs font-bold text-[#3D1C11] shadow-[0_14px_30px_-8px_rgba(0,0,0,0.55)] transition-colors hover:bg-white btn-smooth-press cursor-pointer"
          >
            <span>Track Live Order</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#C44D27]" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
