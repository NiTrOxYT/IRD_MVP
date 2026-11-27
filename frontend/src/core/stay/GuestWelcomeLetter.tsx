import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { gsap, SplitText, useGSAP } from "../ui/gsap";
import {
  DEFAULT_ENVELOPE_TIMING,
  loadWelcomeEnvelopeTiming,
  type WelcomeEnvelopeTimingConfig,
} from "./welcomeEnvelopeConfig";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";

export const DEFAULT_WELCOME_MESSAGE =
  "It is our privilege to welcome you. Every detail of your suite has been thoughtfully prepared for quiet comfort and unhurried rest.\n\nWhether you wish to savour freshly plated in-room dining or arrange suite care at any hour, our hospitality team is delighted to look after you throughout your stay.";

interface GuestWelcomeLetterProps {
  stay: VerifiedStaySession;
  property?: PropertySettings | null;
  fallbackLogo?: string | null;
  onContinue: () => void;
}

function formatWelcomeBody(rawMessage: string | null | undefined, guestName: string): string {
  const base = rawMessage?.trim() || DEFAULT_WELCOME_MESSAGE;
  return base.replace(/\{\{\s*guest_?name\s*\}\}|\{\s*guest_?name\s*\}/gi, guestName);
}

/**
 * Embossed crimson-oxblood botanical wax seal matching the Sculpted Rose/Anemone
 * center clasp in the reference pocket envelope.
 */
function BotanicalWaxSeal() {
  const petals = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-[64px] w-[64px] sm:h-[70px] sm:w-[70px] drop-shadow-[0_7px_14px_rgba(14,1,2,0.72)]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="env-pin-wax-base" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#8F1D26" />
          <stop offset="52%" stopColor="#650D14" />
          <stop offset="100%" stopColor="#3B0509" />
        </radialGradient>
        <radialGradient id="env-pin-wax-well" cx="55%" cy="58%" r="65%">
          <stop offset="0%" stopColor="#42060A" />
          <stop offset="70%" stopColor="#5D0B12" />
          <stop offset="100%" stopColor="#851922" />
        </radialGradient>
        <linearGradient id="env-pin-wax-rim" x1="15%" y1="12%" x2="85%" y2="88%">
          <stop offset="0%" stopColor="#B84B54" stopOpacity="0.85" />
          <stop offset="48%" stopColor="#74131B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#A6343E" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id="env-pin-petal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A4353E" />
          <stop offset="50%" stopColor="#6E1219" />
          <stop offset="100%" stopColor="#3B0408" />
        </linearGradient>
      </defs>

      {/* Hand-poured irregular wax puddle */}
      <path
        d="M50 7 C61 6.5, 72 10.5, 80.5 18.2 C88.6 25.5, 92.8 36.8, 92.5 48.8 C92.2 60.5, 89.2 72.2, 81 80.5 C72.5 89, 60.4 93.4, 48.2 92.8 C36.2 92.2, 24.4 88.2, 16.6 79.6 C8.8 71, 6.2 59.5, 7.2 47.4 C8.2 35.4, 12.6 24.2, 21.4 16.4 C30.2 8.6, 39.5 7.5, 50 7 Z"
        fill="url(#env-pin-wax-base)"
        stroke="url(#env-pin-wax-rim)"
        strokeWidth="1.8"
      />

      {/* Recessed inner stamp well */}
      <circle
        cx="50"
        cy="50"
        r="34.5"
        fill="url(#env-pin-wax-well)"
        stroke="#3A0408"
        strokeWidth="1.2"
      />
      <circle
        cx="50"
        cy="50"
        r="32.5"
        fill="none"
        stroke="#B3424B"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />

      {/* Outer sculpted floral petals */}
      <g transform="translate(50 50)">
        {petals.map((deg, idx) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path
              d="M0 -7 C6.5 -13, 12.5 -24, 6.8 -30 C3.2 -32.2, -3.2 -32.2, -6.8 -30 C-12.5 -24, -6.5 -13, 0 -7 Z"
              fill="url(#env-pin-petal)"
              stroke="#330306"
              strokeWidth="0.9"
              opacity={idx % 2 === 0 ? 0.98 : 0.9}
            />
            <path
              d="M0 -11 L0 -26.5 M-2.5 -16 L-4 -24 M2.5 -16 L4 -24"
              stroke="#B24750"
              strokeOpacity="0.45"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* Inner ruffled corolla layer */}
        {[18, 90, 162, 234, 306].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d="M0 -4 C4.8 -9, 7.5 -15, 4.2 -18.8 C1.6 -20.5, -1.6 -20.5, -4.2 -18.8 C-7.5 -15, -4.8 -9, 0 -4 Z"
            fill="#7D1821"
            stroke="#370408"
            strokeWidth="0.85"
          />
        ))}

        {/* Stamen core & embossed specular dots */}
        <circle cx="0" cy="0" r="6.2" fill="#410509" stroke="#9B333C" strokeWidth="0.7" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <circle
            key={deg}
            cx={Math.cos((deg * Math.PI) / 180) * 4.4}
            cy={Math.sin((deg * Math.PI) / 180) * 4.4}
            r="1.05"
            fill="#C0555E"
            opacity="0.85"
          />
        ))}
        <circle cx="-1.2" cy="-1.2" r="1.8" fill="#8C222B" />
      </g>
    </svg>
  );
}

/**
 * Handmade cotton rag stationery backing with authentic organic deckle edges
 * and directional cotton-pulp diffuse texture lighting.
 */
function DeckleCottonSheetBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_10px_24px_rgba(14,1,2,0.44)]"
    >
      <defs>
        {/* Unified organic deckle silhouette + isotropic matte cotton pulp tooth */}
        <filter id="env-pin-cotton-paper" x="-6%" y="-4%" width="112%" height="108%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.036"
            numOctaves="4"
            seed="14"
            result="edgeNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="edgeNoise"
            scale="6.5"
            xChannelSelector="R"
            yChannelSelector="G"
            result="deckledBase"
          />

          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="3"
            seed="5"
            result="fiberNoise"
          />
          <feDiffuseLighting
            in="fiberNoise"
            lightingColor="#FFFDF8"
            surfaceScale="1.45"
            diffuseConstant="1.05"
            result="rawFiber"
          >
            <feDistantLight azimuth="46" elevation="58" />
          </feDiffuseLighting>
          <feComponentTransfer in="rawFiber" result="softFiber">
            <feFuncR type="linear" slope="0.26" intercept="0.74" />
            <feFuncG type="linear" slope="0.26" intercept="0.74" />
            <feFuncB type="linear" slope="0.26" intercept="0.74" />
          </feComponentTransfer>

          <feBlend in="deckledBase" in2="softFiber" mode="multiply" result="texturedPaper" />
          <feComposite in="texturedPaper" in2="deckledBase" operator="in" />
        </filter>

        <linearGradient id="env-pin-cotton-base" x1="8%" y1="4%" x2="92%" y2="96%">
          <stop offset="0%" stopColor="#F5F0E3" />
          <stop offset="24%" stopColor="#F4F1E9" />
          <stop offset="76%" stopColor="#EEEAE0" />
          <stop offset="100%" stopColor="#E6E1D5" />
        </linearGradient>

        <radialGradient id="env-pin-cotton-patina" cx="14%" cy="10%" r="48%">
          <stop offset="0%" stopColor="#DFCFAF" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#F4F1E9" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g filter="url(#env-pin-cotton-paper)">
        <rect
          x="1.4%"
          y="1%"
          width="97.2%"
          height="98%"
          rx="11"
          fill="url(#env-pin-cotton-base)"
        />
        <rect
          x="1.4%"
          y="1%"
          width="97.2%"
          height="98%"
          rx="11"
          fill="url(#env-pin-cotton-patina)"
        />
      </g>
    </svg>
  );
}

export function GuestWelcomeLetter({
  stay,
  property,
  fallbackLogo,
  onContinue,
}: GuestWelcomeLetterProps) {
  const stageRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [timing, setTiming] = useState<WelcomeEnvelopeTimingConfig>(DEFAULT_ENVELOPE_TIMING);
  const [readyToAnimate, setReadyToAnimate] = useState(false);

  const propertyName = property?.name?.trim() || "Aura Resort & Spa";
  const logoSrc = property?.logoUrl || fallbackLogo || "/kusum-kunja-cafe-logo.png";
  const guestName = stay.guestName?.trim() || "Guest";
  const roomNumber = stay.room?.roomNumber?.trim() || "Suite";
  const letterBody = formatWelcomeBody(property?.welcomeMessage, guestName);

  useEffect(() => {
    let active = true;
    const fontsReady =
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();

    Promise.all([loadWelcomeEnvelopeTiming(), fontsReady]).then(([cfg]) => {
      if (!active) return;
      setTiming(cfg);
      setReadyToAnimate(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const { contextSafe } = useGSAP(
    () => {
      if (!readyToAnimate) return;

      const rootEl = stageRef.current;
      if (!rootEl) return;

      const splitInstances: SplitText[] = [];
      const mm = gsap.matchMedia();

      const sheetEl = rootEl.querySelector<HTMLElement>(".gsap-letter-sheet");
      const pocketEl = rootEl.querySelector<HTMLElement>(".gsap-pocket-front");

      const computeClosedMetrics = () => {
        const sheetH = sheetEl?.offsetHeight || 520;
        const pocketH = pocketEl?.offsetHeight || 242;
        const tuckedDrop = Math.max(180, sheetH - pocketH + 34);
        const stageCenterShift = -Math.max(0, (sheetH - pocketH) * 0.42);
        return { tuckedDrop, stageCenterShift };
      };

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const salutationSplit = SplitText.create(".gsap-letter-salutation", {
          type: "words, chars",
          aria: "auto",
        });
        const bodySplit = SplitText.create(".gsap-letter-body", {
          type: "words, chars",
          aria: "auto",
        });
        splitInstances.push(salutationSplit, bodySplit);

        const { tuckedDrop, stageCenterShift } = computeClosedMetrics();

        // Set deterministic closed-envelope initial state before revealing the stage
        gsap.set(".gsap-envelope-stage", {
          autoAlpha: 0,
          y: stageCenterShift,
          scale: 0.96,
          force3D: true,
        });
        gsap.set(".gsap-letter-sheet", {
          y: tuckedDrop,
          autoAlpha: 1,
          force3D: true,
        });
        gsap.set(".gsap-envelope-flap", {
          rotationX: 0,
          zIndex: 35,
          autoAlpha: 1,
          transformOrigin: "top center",
          force3D: true,
        });
        gsap.set(".gsap-flap-inner-shade", { opacity: 0 });
        gsap.set(".gsap-wax-seal", { zIndex: 40, scale: 1, y: 0, force3D: true });
        gsap.set(".gsap-pocket-seam-shadow", { opacity: 0.35 });
        gsap.set(".gsap-letter-header-band", { autoAlpha: 0, y: 6, force3D: true });
        gsap.set([salutationSplit.chars, bodySplit.chars], { autoAlpha: 0 });
        gsap.set(".gsap-letter-signature", {
          autoAlpha: 0,
          clipPath: "inset(0 100% 0 0)",
        });
        gsap.set(".gsap-letter-cta", { autoAlpha: 0, y: 8, force3D: true });

        const openDelay = Math.max(0.15, timing.autoPlayDelay);
        const tl = gsap.timeline({
          defaults: { overwrite: "auto", force3D: true },
        });
        timelineRef.current = tl;

        // Guarantee closed flap & seal z-order at frame 0 (including on Replay)
        tl.set(".gsap-envelope-flap", { zIndex: 35, rotationX: 0, autoAlpha: 1 }, 0)
          .set(".gsap-wax-seal", { zIndex: 40, scale: 1, y: 0 }, 0)
          .fromTo(
            ".gsap-envelope-stage",
            { autoAlpha: 0, scale: 0.96, y: stageCenterShift },
            { autoAlpha: 1, scale: 1, duration: 0.42, ease: "power2.out" },
            0
          )
          .addLabel("sealRelease", openDelay)
          .to(
            ".gsap-wax-seal",
            {
              scale: 1.05,
              y: 2,
              duration: timing.sealBreakDuration * 0.55,
              ease: "power2.out",
            },
            "sealRelease"
          )
          .to(
            ".gsap-wax-seal",
            {
              scale: 1,
              y: 0,
              duration: timing.sealBreakDuration * 0.45,
              ease: "power2.inOut",
            },
            ">"
          )
          // Flap lifts cleanly from the closed position; seal settles onto the front pocket
          .addLabel("flapOpen", `>-${Math.min(0.06, timing.sealBreakDuration * 0.3)}`)
          .set(".gsap-wax-seal", { zIndex: 32 }, "flapOpen")
          .to(
            ".gsap-envelope-flap",
            {
              rotationX: 178,
              duration: timing.flapOpenDuration,
              ease: "power3.inOut",
            },
            "flapOpen"
          )
          .set(".gsap-envelope-flap", { zIndex: 15 }, `flapOpen+=${timing.flapOpenDuration * 0.48}`)
          .to(
            ".gsap-flap-inner-shade",
            {
              opacity: 0.55,
              duration: timing.flapOpenDuration * 0.65,
              ease: "power2.inOut",
            },
            "flapOpen"
          )
          // Once behind the rising paper, recede open flap cleanly into the back pocket wall
          .to(
            ".gsap-envelope-flap",
            {
              autoAlpha: 0,
              duration: timing.envelopeSettleDuration * 0.55,
              ease: "power2.out",
            },
            `flapOpen+=${timing.flapOpenDuration * 0.72}`
          )
          // Deckle cotton letter rises out of the velvet pocket while stage settles to center
          .addLabel("letterRise", `>-${Math.min(0.24, timing.flapOpenDuration * 0.4)}`)
          .to(
            ".gsap-letter-sheet",
            {
              y: 0,
              duration: timing.letterRiseDuration,
              ease: "power3.out",
            },
            "letterRise"
          )
          .to(
            ".gsap-envelope-stage",
            {
              y: 0,
              duration: timing.envelopeSettleDuration,
              ease: "power3.inOut",
            },
            "letterRise"
          )
          .to(
            ".gsap-pocket-seam-shadow",
            {
              opacity: 1,
              duration: timing.envelopeSettleDuration * 0.7,
              ease: "power2.out",
            },
            "letterRise"
          )
          // Refined editorial typography reveal (smooth ink-soak, zero vertical bounce)
          .addLabel("textReveal", `>-${Math.min(0.26, timing.letterRiseDuration * 0.32)}`)
          .to(
            ".gsap-letter-header-band",
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.38,
              ease: "power2.out",
            },
            "textReveal"
          )
          .to(
            salutationSplit.chars,
            {
              autoAlpha: 1,
              duration: timing.salutationCharDuration,
              stagger: timing.salutationCharStagger,
              ease: "power2.out",
            },
            `>+${timing.salutationDelay * 0.5}`
          )
          .to(
            bodySplit.chars,
            {
              autoAlpha: 1,
              duration: timing.bodyCharDuration,
              stagger: timing.bodyCharStagger,
              ease: "sine.out",
            },
            ">-0.18"
          )
          .addLabel("closing", `>+${timing.signatureDelay}`)
          .to(
            ".gsap-letter-signature",
            {
              autoAlpha: 1,
              clipPath: "inset(0 0% 0 0)",
              duration: Math.max(0.45, timing.signatureCharDuration + timing.signatureCharStagger * 6),
              ease: "power2.inOut",
            },
            "closing"
          )
          .to(
            ".gsap-letter-cta",
            {
              autoAlpha: 1,
              y: 0,
              duration: timing.ctaRevealDuration,
              ease: "power2.out",
            },
            ">-0.2"
          );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".gsap-envelope-stage", { autoAlpha: 1, y: 0, scale: 1 });
        gsap.set(".gsap-letter-sheet", { y: 0, autoAlpha: 1 });
        gsap.set(".gsap-envelope-flap", { rotationX: 178, zIndex: 15, autoAlpha: 0 });
        gsap.set(".gsap-wax-seal", { zIndex: 32 });
        gsap.set(
          [".gsap-letter-header-band", ".gsap-letter-signature", ".gsap-letter-cta"],
          { autoAlpha: 1, clearProps: "clipPath,transform" }
        );
        gsap.fromTo(".gsap-envelope-stage", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
      });

      return () => {
        timelineRef.current?.kill();
        mm.revert();
        splitInstances.forEach((inst) => inst.revert());
      };
    },
    { scope: stageRef, dependencies: [readyToAnimate], revertOnUpdate: true }
  );

  const handleReplay = contextSafe(() => {
    timelineRef.current?.restart();
  });

  const handleOpenImmediately = contextSafe(() => {
    if (timelineRef.current && timelineRef.current.time() < timing.autoPlayDelay) {
      timelineRef.current.play("sealRelease");
    }
  });

  const handleEnterSuite = contextSafe(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onContinue();
      return;
    }
    gsap.to(".gsap-envelope-stage", {
      autoAlpha: 0,
      y: -14,
      scale: 0.985,
      duration: timing.exitDuration,
      ease: "power2.in",
      onComplete: onContinue,
    });
  });

  return (
    <main
      ref={stageRef}
      className="relative isolate flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden bg-[#2B0002] px-4 py-6 sm:px-6 sm:py-9"
    >
      {/* Velvet Burgundy Studio Vignette (matching reference backdrop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_42%,#48070B_0%,#2B0002_58%,#190001_100%)]"
      />

      {/* Whisper-quiet top bar */}
      <div className="relative z-40 mb-4 flex w-full max-w-[440px] items-center justify-between text-[11px] tracking-[0.06em] text-white/60">
        <button
          type="button"
          onClick={handleReplay}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors hover:text-white cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Replay</span>
        </button>
        <button
          type="button"
          onClick={handleEnterSuite}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors hover:text-white cursor-pointer"
        >
          <span>Skip to Portal</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Physical Envelope & Rising Cotton Letter Assembly */}
      <div
        onClick={handleOpenImmediately}
        className="gsap-envelope-stage relative z-10 w-full max-w-[440px] cursor-pointer"
        style={{ opacity: 0, visibility: "hidden", perspective: "1500px" }}
      >
        {/* Envelope Back Wall + Corner Ear-Tabs + Hinged Top Flap (positioned behind the letter pocket) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[230px] sm:h-[252px]"
          style={{ perspective: "1500px" }}
        >
          <svg
            viewBox="0 0 460 265"
            preserveAspectRatio="none"
            className="h-full w-full drop-shadow-[0_26px_46px_rgba(12,0,1,0.78)]"
          >
            <defs>
              <linearGradient id="env-pin-back-wall" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#521217" />
                <stop offset="50%" stopColor="#420C10" />
                <stop offset="100%" stopColor="#35080B" />
              </linearGradient>
            </defs>
            {/* Flush pocket shoulders aligned cleanly under the top flap hinge */}
            <path
              d="M0,265 L0,34 Q1,28 10,28 L44,28 L230,96 L416,28 L450,28 Q459,28 460,34 L460,265 Z"
              fill="url(#env-pin-back-wall)"
            />
          </svg>
        </div>

        {/* Hinged 3D Top Flap (top hinge aligned at pocket mouth, folds down over front pocket when closed) */}
        <div
          aria-hidden="true"
          className="gsap-envelope-flap pointer-events-none absolute inset-x-0 bottom-[52px] sm:bottom-[55px] h-[155px] sm:h-[172px]"
          style={{
            zIndex: 35,
            transformOrigin: "top center",
            backfaceVisibility: "visible",
            willChange: "transform",
          }}
        >
          <svg
            viewBox="0 0 460 172"
            preserveAspectRatio="none"
            className="h-full w-full drop-shadow-[0_14px_22px_rgba(18,1,3,0.52)]"
          >
            <defs>
              <linearGradient id="env-pin-top-flap" x1="0%" y1="0%" x2="90%" y2="100%">
                <stop offset="0%" stopColor="#65191F" />
                <stop offset="55%" stopColor="#511116" />
                <stop offset="100%" stopColor="#410B10" />
              </linearGradient>
            </defs>
            {/* Soft baronial rounded point flap that tucks smoothly toward center seam */}
            <path
              d="M0,4 Q1,0 16,0 L444,0 Q459,0 460,4 L244,150 Q230,159 216,150 Z"
              fill="url(#env-pin-top-flap)"
              stroke="#7A262D"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            {/* Inner shading clipped cleanly to exact triangular flap path (no rectangular box) */}
            <path
              d="M0,4 Q1,0 16,0 L444,0 Q459,0 460,4 L244,150 Q230,159 216,150 Z"
              fill="#2C0508"
              opacity="0"
              className="gsap-flap-inner-shade"
            />
          </svg>
        </div>

        {/* Letter Rising Clip Track (bottom-flush with pocket bottom so card rises seamlessly out) */}
        <div className="gsap-letter-clip relative z-20 w-full overflow-hidden">
          <article
            className="gsap-letter-sheet relative mx-auto flex min-h-[456px] w-[89%] flex-col justify-between px-6 pt-8 pb-[178px] text-[#241614] sm:min-h-[494px] sm:px-9 sm:pt-9 sm:pb-[196px]"
            style={{ willChange: "transform" }}
          >
            <DeckleCottonSheetBackground />

            {/* Subtle property header inside handmade paper */}
            <header className="gsap-letter-header-band relative z-10 flex items-center justify-between gap-3 border-b border-[#D7CCB8]/70 pb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={logoSrc}
                  alt={`${propertyName} logo`}
                  className="h-8 w-8 shrink-0 rounded-full border border-[#CFC3AD] bg-[#FAF7F0] p-0.5 object-contain"
                />
                <div className="min-w-0">
                  <p className="truncate font-serif text-sm font-semibold tracking-wide text-[#241614] sm:text-[15px]">
                    {propertyName}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6E5C50] tabular-nums">
                    Suite {roomNumber}
                  </p>
                </div>
              </div>
            </header>

            {/* Letter Copy */}
            <section className="relative z-10 space-y-4 pt-5 pb-4">
              <h1
                className="gsap-letter-salutation font-serif text-[25px] font-semibold italic leading-snug text-[#231412] sm:text-[28px]"
                style={{ fontKerning: "none", textRendering: "optimizeSpeed" }}
              >
                Dear {guestName},
              </h1>

              <p
                className="gsap-letter-body whitespace-pre-line font-sans text-[13px] leading-[1.82] text-[#352521] sm:text-[13.5px]"
                style={{ fontKerning: "none", textRendering: "optimizeSpeed" }}
              >
                {letterBody}
              </p>

              <div className="pt-2">
                <div className="gsap-letter-signature inline-flex flex-col gap-0.5">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7A6357]">
                    Warmly,
                  </span>
                  <p
                    className="text-[24px] font-semibold italic leading-tight tracking-[0.005em] text-[#4E1117] sm:text-[26px]"
                    style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
                  >
                    {propertyName}
                  </p>
                </div>
              </div>
            </section>

            {/* Understated Editorial CTA positioned above the pocket rim */}
            <footer className="gsap-letter-cta relative z-10 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnterSuite();
                }}
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#470C12] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FBF7F0] shadow-[0_10px_24px_-8px_rgba(40,4,8,0.55)] transition-colors hover:bg-[#5E121A] cursor-pointer active:scale-[0.985]"
              >
                <span>Enter Suite Portal</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </footer>
          </article>
        </div>

        {/* Front Deep Burgundy Pocket Wings + Rounded Lower Fold + Floral Wax Seal */}
        <div
          aria-hidden="true"
          className="gsap-pocket-front pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[230px] sm:h-[252px]"
        >
          {/* Ambient interior shadow cast by pocket V-rim onto the cream cotton paper */}
          <svg
            viewBox="0 0 460 265"
            preserveAspectRatio="none"
            className="gsap-pocket-seam-shadow absolute inset-0 h-full w-full"
          >
            <defs>
              <filter id="env-pin-pocket-blur" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="5.5" />
              </filter>
            </defs>
            <path
              d="M12,26 L230,152 L448,26 L448,50 L230,174 L12,50 Z"
              fill="#190204"
              opacity="0.65"
              filter="url(#env-pin-pocket-blur)"
            />
          </svg>

          {/* Velvet Burgundy V-Pocket Geometry with Paper Micro-Tooth Grain */}
          <svg
            viewBox="0 0 460 265"
            preserveAspectRatio="none"
            className="relative h-full w-full"
          >
            <defs>
              {/* Tactile suede/cotton paper tooth */}
              <filter id="env-pin-velvet-tooth" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.88"
                  numOctaves="3"
                  seed="11"
                  result="grain"
                />
                <feDiffuseLighting
                  in="grain"
                  lightingColor="#D9989E"
                  surfaceScale="1.05"
                  result="lit"
                >
                  <feDistantLight azimuth="40" elevation="55" />
                </feDiffuseLighting>
                <feComposite in="lit" in2="SourceGraphic" operator="in" />
              </filter>

              <filter id="env-pin-bottom-drop" x="-8%" y="-18%" width="116%" height="130%">
                <feDropShadow dx="0" dy="-4" stdDeviation="4.5" floodColor="#180204" floodOpacity="0.62" />
              </filter>

              <linearGradient id="env-pin-left-wing" x1="0%" y1="12%" x2="88%" y2="85%">
                <stop offset="0%" stopColor="#65191F" />
                <stop offset="52%" stopColor="#521116" />
                <stop offset="100%" stopColor="#3B090D" />
              </linearGradient>

              <linearGradient id="env-pin-right-wing" x1="100%" y1="12%" x2="12%" y2="85%">
                <stop offset="0%" stopColor="#5E161C" />
                <stop offset="52%" stopColor="#4B0E13" />
                <stop offset="100%" stopColor="#37080B" />
              </linearGradient>

              <linearGradient id="env-pin-bottom-fold" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#561319" />
                <stop offset="48%" stopColor="#450C11" />
                <stop offset="100%" stopColor="#32070A" />
              </linearGradient>

              <clipPath id="env-pin-pocket-shape">
                <path d="M0,26 Q2,34 230,162 Q458,34 460,26 L460,265 L0,265 Z" />
              </clipPath>
            </defs>

            {/* Left Diagonal Wing */}
            <path
              d="M0,26 L236,162 L236,265 L0,265 Z"
              fill="url(#env-pin-left-wing)"
            />
            <line
              x1="0"
              y1="26"
              x2="225"
              y2="155"
              stroke="#9D3F47"
              strokeOpacity="0.34"
              strokeWidth="1.2"
            />

            {/* Right Diagonal Wing */}
            <path
              d="M460,26 L224,162 L224,265 L460,265 Z"
              fill="url(#env-pin-right-wing)"
            />
            <line
              x1="460"
              y1="26"
              x2="235"
              y2="155"
              stroke="#91363E"
              strokeOpacity="0.28"
              strokeWidth="1.2"
            />

            {/* Overlapping Lower Triangle Fold with Softly Rounded Center Apex */}
            <g filter="url(#env-pin-bottom-drop)">
              <path
                d="M0,265 L212,130 Q230,119 248,130 L460,265 Z"
                fill="url(#env-pin-bottom-fold)"
              />
              <path
                d="M4,263 L212,131 Q230,120 248,131 L456,263"
                fill="none"
                stroke="#923B43"
                strokeOpacity="0.25"
                strokeWidth="1"
              />
            </g>

            {/* Crisp bottom folded lip highlight */}
            <line
              x1="2"
              y1="264"
              x2="458"
              y2="264"
              stroke="#7A2930"
              strokeOpacity="0.45"
              strokeWidth="1.4"
            />

            {/* Tactile cotton suede micro-grain overlay clipped to pocket */}
            <rect
              x="0"
              y="0"
              width="460"
              height="265"
              clipPath="url(#env-pin-pocket-shape)"
              filter="url(#env-pin-velvet-tooth)"
              opacity="0.22"
              style={{ mixBlendMode: "soft-light" }}
            />
          </svg>
        </div>

        {/* Embossed Crimson Botanical Wax Seal (shares stage stacking context so it seals the closed flap at z=40, then settles onto front pocket at z=32) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[230px] sm:h-[252px]"
        >
          <div
            className="gsap-wax-seal pointer-events-none absolute left-1/2 top-[53%] -translate-x-1/2 -translate-y-1/2"
            style={{ zIndex: 40, willChange: "transform" }}
          >
            <BotanicalWaxSeal />
          </div>
        </div>
      </div>
    </main>
  );
}
