import React, { useRef } from "react";
import { gsap, useGSAP } from "./gsap";
import { cn } from "./utils";

export type TransitionDirection = "depth" | "forward" | "back" | "fade";

interface PageTransitionProps {
  /** Changing this key triggers a GPU-composited GSAP screen entrance */
  viewKey: string | number;
  direction?: TransitionDirection;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps route/tab/mode screens with a GPU-composited GSAP stage entrance.
 * Automatically respects prefers-reduced-motion and cleans up on unmount.
 */
export function PageTransition({
  viewKey,
  direction = "depth",
  className,
  children,
}: PageTransitionProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = stageRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const fromVars: gsap.TweenVars =
          direction === "forward"
            ? { autoAlpha: 0, x: 14 }
            : direction === "back"
            ? { autoAlpha: 0, x: -14 }
            : { autoAlpha: 0, y: 10 };

        gsap.fromTo(el, fromVars, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
          force3D: true,
          clearProps: "transform",
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.16 });
      });
    },
    { scope: stageRef, dependencies: [viewKey], revertOnUpdate: true }
  );

  return (
    <div ref={stageRef} key={viewKey} className={cn(className)}>
      {children}
    </div>
  );
}

interface Tilt3DCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum tilt angle in degrees (clamped for enterprise subtlety) */
  maxTilt?: number;
  /** Applied to the inner moving surface so outer pointer hitbox never jitters */
  surfaceClassName?: string;
  /** Optional warm specular highlight tracking the cursor */
  glare?: boolean;
  children: React.ReactNode;
}

/**
 * Zero-rerender 3D perspective card.
 * Keeps the outer wrapper stationary as the hit target while rotating the inner
 * `.card-3d-surface` via CSS custom properties updated inside rAF.
 */
export function Tilt3DCard({
  maxTilt = 4.5,
  className,
  surfaceClassName,
  glare = true,
  onMouseMove,
  onMouseLeave,
  children,
  ...rest
}: Tilt3DCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(e);
    const el = wrapperRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const rx = ((0.5 - py) * 2 * maxTilt).toFixed(2);
      const ry = ((px - 0.5) * 2 * maxTilt).toFixed(2);

      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e);
    const el = wrapperRef.current;
    if (!el) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("card-3d-wrap", className)}
      {...rest}
    >
      <div className={cn("card-3d-surface", surfaceClassName)}>
        {glare && <div className="card-3d-glare" aria-hidden="true" />}
        {children}
      </div>
    </div>
  );
}
