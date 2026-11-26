import React from "react";

interface IconProps {
  className?: string;
  accentColor?: string;
}

/** Boutique resort pavilion / villa silhouette with architectural roof & courtyard arch */
export function ResortVillaIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 10.2L12 3.5l9 6.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 9.4V19.5h13.6V9.4"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 19.5v-4.8a2.4 2.4 0 0 1 4.8 0v4.8"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.5 19.5h17"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Realistic hotel serving cloche with top finial, curved highlight & butler tray */
export function SilverClocheTrayIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="6.2" r="1.4" fill="currentColor" />
      <path
        d="M4.5 16.5a7.5 7.5 0 0 1 15 0H4.5Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 13.6c.8-2.1 2.4-3.4 4.4-3.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M2.5 16.5h19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4.5 19.2h15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/** Classic brass suite key fob & concierge service bell */
export function SuiteCareBellIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M10.2 6h3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 6v2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5.5 15.8a6.5 6.5 0 0 1 13 0v1.2h-13v-1.2Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.3 13.4c.7-1.6 1.9-2.6 3.5-2.9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect
        x="3.5"
        y="17.2"
        width="17"
        height="2.6"
        rx="1.3"
        fill="currentColor"
        fillOpacity="0.28"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/** Realistic pocket expedition compass with engraved bezel ticks & split needle */
export function LandmarkCompassIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M10.5 2.8h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle
        cx="12"
        cy="13"
        r="8.2"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 6.5v1.2M12 18.3v1.2M5.5 13h1.2M17.3 13h1.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
      />
      <polygon
        points="15.3 9.7 13.3 14.1 10.9 11.7"
        fill="currentColor"
      />
      <polygon
        points="8.7 16.3 10.9 11.7 13.3 14.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="1" fill="#F8F5EF" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Artisan espresso cup & saucer with rising aroma curls */
export function EspressoCupSteamIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9.5 4.2c0 1.2-1 1.6-1 2.7M13.5 3.8c0 1.3-1 1.7-1 2.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M5.2 9.5h10.8v4.6a4.8 4.8 0 0 1-4.8 4.8H10a4.8 4.8 0 0 1-4.8-4.8V9.5Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M16 10.8h1.5a2.3 2.3 0 0 1 0 4.6H16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 20.5h13.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Footed patisserie dessert dome / layered cake slice */
export function ArtisanalPastryIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="6" r="1.3" fill="currentColor" />
      <path
        d="M6.5 11.5a5.5 5.5 0 0 1 11 0v4.2h-11v-4.2Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 12.6c1.8.9 3.6-.9 5.5 0s3.7-.9 5.5 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M4 16h16M12 16v3.5M8.5 19.5h7" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

/** Tailored leather/linen boutique suite order bag with brass clasp */
export function SuiteOrderBagIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.8 8.5V6.6a3.2 3.2 0 0 1 6.4 0v1.9"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M5.2 8.5h13.6l1.1 11a1.5 1.5 0 0 1-1.5 1.6H5.6a1.5 1.5 0 0 1-1.5-1.6l1.1-11Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.2" r="1.15" fill="currentColor" />
    </svg>
  );
}

/** Real brass chef seal / reserve emblem (replaces generic Sparkles badge icon) */
export function HeritageCrestIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.2l2.1 2.7 3.4-.3.7 3.3 3 1.7-1.6 3 .9 3.3-3.2 1.1-1.4 3.1-3.3-.9-2.6 2-2.6-2-3.3.9-1.4-3.1-3.2-1.1.9-3.3-1.6-3 3-1.7.7-3.3 3.4.3L12 3.2Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** Stacked folded hotel linen & bath towels */
export function FoldedTowelStackIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="4.5"
        y="6"
        width="15"
        height="4.4"
        rx="2"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="4.5"
        y="12"
        width="15"
        height="5.2"
        rx="2"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M16.5 14.6h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Boutique glass apothecary amenity flacon & dispenser */
export function AmenityFlaconIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9.5 4h5v2.2h-5z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 6.2V8" stroke="currentColor" strokeWidth="1.5" />
      <rect
        x="6.5"
        y="8"
        width="11"
        height="12"
        rx="2.6"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <rect x="8.8" y="11.5" width="6.4" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}

/** King suite headboard & layered pillows */
export function SuiteBedIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 11V6.8a1.8 1.8 0 0 1 1.8-1.8h11.4a1.8 1.8 0 0 1 1.8 1.8V11" stroke="currentColor" strokeWidth="1.65" />
      <rect x="6.5" y="7.8" width="4.5" height="3.2" rx="1" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.3" />
      <rect x="13" y="7.8" width="4.5" height="3.2" rx="1" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3 11.2h18v5.5H3v-5.5Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M4.5 16.8v2.2M19.5 16.8v2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Turndown bedside lantern & crescent evening care */
export function TurndownCrescentIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M15.8 14.8A6.2 6.2 0 0 1 9.2 8.2c0-.9.2-1.8.5-2.5A7 7 0 1 0 18.3 14.3c-.7.3-1.6.5-2.5.5Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M16.5 6.2v2.4M15.3 7.4h2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Heritage brass bellman luggage trolley & trunk */
export function PorterLuggageIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" stroke="currentColor" strokeWidth="1.6" />
      <rect
        x="5"
        y="7"
        width="14"
        height="11.2"
        rx="2"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <path d="M9 7v11.2M15 7v11.2" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
      <circle cx="8" cy="19.6" r="1.2" fill="currentColor" />
      <circle cx="16" cy="19.6" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Architectural suite refresh feather duster / mirror frame */
export function SuiteRefreshIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="7"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <path d="M9 10.5l4-3.5M9.5 14l5-4.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
      <path d="M4.5 20h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
