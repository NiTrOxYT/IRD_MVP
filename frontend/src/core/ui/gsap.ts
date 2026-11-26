import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollToPlugin, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });
gsap.ticker.lagSmoothing(500, 33);

export { gsap, ScrollTrigger, SplitText, useGSAP };

/**
 * Registers staggered ScrollTrigger.batch entrance reveals scoped inside a GSAP context.
 * Falls back cleanly to a subtle opacity fade when prefers-reduced-motion is enabled.
 */
export function setupScrollBatchCards(
  scopeEl: HTMLElement,
  selector: string,
  options?: { stagger?: number; y?: number; start?: string }
) {
  const cards = gsap.utils.toArray<HTMLElement>(selector, scopeEl);
  if (cards.length === 0) return;

  const { stagger = 0.055, y = 16, start = "top 94%" } = options ?? {};
  const mm = gsap.matchMedia();

  mm.add(
    {
      noMotion: "(prefers-reduced-motion: no-preference)",
      isCoarse: "(pointer: coarse)",
    },
    (context) => {
      const { noMotion, isCoarse } = context.conditions as {
        noMotion: boolean;
        isCoarse: boolean;
      };
      if (!noMotion) return;

      const offsetY = isCoarse ? Math.min(y, 10) : y;
      const stepStagger = isCoarse ? Math.min(stagger, 0.035) : stagger;

      gsap.set(cards, { autoAlpha: 0, y: offsetY, force3D: true });
      ScrollTrigger.batch(cards, {
        start,
        once: true,
        interval: 0.06,
        batchMax: 6,
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: isCoarse ? 0.34 : 0.46,
            stagger: stepStagger,
            ease: "power2.out",
            force3D: true,
            overwrite: true,
            clearProps: "transform",
          });
        },
      });
    }
  );

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.fromTo(cards, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, overwrite: true });
  });
}

export function smoothScrollToTarget(target: string | number, offsetY = 72) {
  gsap.killTweensOf(window);
  if (typeof target === "number" && target === 0 && window.scrollY <= 2) {
    return;
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    if (typeof target === "number") {
      window.scrollTo({ top: target });
    } else {
      document.querySelector(target)?.scrollIntoView();
    }
    return;
  }

  gsap.to(window, {
    duration: 0.48,
    scrollTo:
      typeof target === "number"
        ? { y: target, autoKill: true }
        : { y: target, offsetY, autoKill: true },
    ease: "power3.out",
    overwrite: "auto",
  });
}
