import React from "react";

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

/** Architectural 2x2 concierge grid mark */
export function ArchServicesIcon({ className = "w-5 h-5", strokeWidth = 1.4 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M17 13.5v7M13.5 17h7" />
    </svg>
  );
}

/** Precision dining cloche silhouette */
export function ArchClocheIcon({ className = "w-5 h-5", strokeWidth = 1.4 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4.5 16.5a7.5 7.5 0 0 1 15 0" />
      <path d="M2.5 16.5h19" />
      <path d="M5 19.5h14" />
      <circle cx="12" cy="7" r="1.25" />
    </svg>
  );
}

/** Architectural suite service bell & keyplate */
export function ArchSuiteCareIcon({ className = "w-5 h-5", strokeWidth = 1.4 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 15a6 6 0 0 1 12 0v1.5H6V15Z" />
      <path d="M3.5 19h17" />
      <path d="M12 9V6.5" />
      <path d="M10 6.5h4" />
    </svg>
  );
}

/** Minimalist meridian compass needle */
export function ArchCompassIcon({ className = "w-5 h-5", strokeWidth = 1.4 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.75" />
      <polygon points="15.2 8.8 13.3 13.3 8.8 15.2 10.7 10.7 15.2 8.8" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
    </svg>
  );
}

/** Architectural concierge folio / orders ledger */
export function ArchFolioIcon({ className = "w-5 h-5", strokeWidth = 1.4 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8.5h7" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 16.5h4.5" />
    </svg>
  );
}

/** Tailored tote / order tray mark */
export function ArchTrayBagIcon({ className = "w-5 h-5", strokeWidth = 1.4 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5.5 8.5h13l-1 11.5h-11L5.5 8.5Z" />
      <path d="M9 8.5V6.75a3 3 0 0 1 6 0V8.5" />
    </svg>
  );
}

/** Standard crisp vegetarian / non-vegetarian FSSAI culinary classification mark */
export function CulinaryClassificationMark({ variant }: { variant: "veg" | "non_veg" }) {
  const isVeg = variant === "veg";
  return (
    <span
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${
        isVeg ? "border-emerald-700" : "border-rose-700"
      }`}
      aria-label={isVeg ? "Vegetarian" : "Non-Vegetarian"}
    >
      {isVeg ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
      ) : (
        <svg viewBox="0 0 10 10" className="h-2 w-2 fill-rose-700" aria-hidden="true">
          <polygon points="5,1.5 8.5,8.5 1.5,8.5" />
        </svg>
      )}
    </span>
  );
}
