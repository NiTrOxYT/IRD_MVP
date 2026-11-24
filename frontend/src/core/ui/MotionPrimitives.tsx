import React, { useRef } from "react";
import { cn } from "./utils";

export type TransitionDirection = "depth" | "forward" | "back" | "fade";

interface PageTransitionProps {
  /** Changing this key triggers a GPU-composited 3D screen entrance */
  viewKey: string | number;
  direction?: TransitionDirection;
  className?: string;
  children: React.ReactNode;
}

const DIRECTION_CLASSES: Record<TransitionDirection, string> = {
  depth: "screen-stage-enter",
  forward: "screen-stage-slide-right",
  back: "screen-stage-slide-left",
  fade: "screen-stage-fade",
};

/**
 * Wraps route/tab/mode screens with a GPU-only 3D perspective entrance.
 * Uses pure CSS keyframes keyed by viewKey so React renders stay lean (60fps).
 */
export function PageTransition({
  viewKey,
  direction = "depth",
  className,
  children,
}: PageTransitionProps) {
  return (
    <div key={viewKey} className={cn(DIRECTION_CLASSES[direction], className)}>
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
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  };

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("card-3d-wrap", className)}
      {...rest}
    >
      <div className={cn("card-3d-surface", glare && "card-3d-glare", surfaceClassName)}>
        {children}
      </div>
    </div>
  );
}
