import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  Clock,
  Compass,
  Film,
  Image as ImageIcon,
  MapPin,
  Package,
  PhoneCall,
  Play,
  Star,
  Ticket,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "../../../../core/ui/utils";
import { useAttractionsAdapter } from "../../adapter";
import type { AttractionMediaItem, LocalAttraction } from "../../types";

export interface AttractionsGuestPortalProps {
  roomNumber?: string;
  contactNumber?: string | null;
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/
  );
  return match ? match[1] : null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0` : null;
}

function StarRating({ rating, compact = false }: { rating: number; compact?: boolean }) {
  const clamped = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div
      className="inline-flex items-center gap-1"
      aria-label={`Rated ${clamped.toFixed(1)} out of 5 stars`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = clamped >= star - 0.25;
          return (
            <Star
              key={star}
              className={cn(
                compact ? "h-3 w-3" : "h-3.5 w-3.5",
                filled ? "fill-[#F2B749] text-[#F2B749]" : "fill-white/10 text-white/30"
              )}
            />
          );
        })}
      </div>
      <span className="font-mono text-[11px] font-semibold text-white/90 tabular-nums">
        {clamped.toFixed(1)}
      </span>
    </div>
  );
}

function MediaPreviewThumb({
  item,
  fallbackImage,
  alt = "",
  className,
}: {
  item?: AttractionMediaItem;
  fallbackImage?: string;
  alt?: string;
  className?: string;
}) {
  if (!item) {
    return (
      <img
        src={fallbackImage || "/suite-welcome-card.jpg"}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  if (item.type === "video") {
    const ytId = getYouTubeVideoId(item.url);
    return (
      <div className={cn("relative h-full w-full overflow-hidden bg-[#111520]", className)}>
        {ytId ? (
          <img
            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
            alt={alt || item.caption || "Video preview"}
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            src={item.url.startsWith("data:") ? item.url : `${item.url}#t=0.5`}
            poster={fallbackImage}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-black/65 text-white backdrop-blur-xs">
            <Play className="h-2.5 w-2.5 fill-white ml-0.5" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <img
      src={item.url}
      alt={alt || item.caption || "Attraction preview"}
      className={cn("h-full w-full object-cover", className)}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackImage || "/suite-welcome-card.jpg";
      }}
    />
  );
}

function MediaStage({
  item,
  fallbackImage,
  muted,
  controls = false,
  className,
}: {
  item?: AttractionMediaItem;
  fallbackImage?: string;
  muted: boolean;
  controls?: boolean;
  className?: string;
}) {
  if (!item) {
    return (
      <img
        src={fallbackImage || "/suite-welcome-card.jpg"}
        alt="Scenic attraction"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  if (item.type === "video") {
    const ytUrl = getYouTubeEmbedUrl(item.url);
    if (ytUrl) {
      return (
        <iframe
          src={ytUrl}
          title={item.caption || "Attraction video"}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className={cn("h-full w-full border-0", className)}
        />
      );
    }
    return (
      <video
        key={item.url}
        src={item.url}
        poster={fallbackImage}
        autoPlay
        loop
        muted={muted}
        playsInline
        controls={controls}
        preload="auto"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <img
      src={item.url}
      alt={item.caption || "Attraction photo"}
      className={cn("h-full w-full object-cover", className)}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackImage || "/suite-welcome-card.jpg";
      }}
    />
  );
}

export function AttractionsGuestPortal({ roomNumber, contactNumber }: AttractionsGuestPortalProps) {
  const { api, formatPrice } = useAttractionsAdapter();
  const [attractions, setAttractions] = useState<LocalAttraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const loadAttractions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getGuestAttractions();
      setAttractions(res.attractions || []);
      if (res.attractions?.length > 0) {
        setActiveId((prev) => prev ?? res.attractions[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Unable to load nearby attractions.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadAttractions();
  }, [loadAttractions]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(attractions.map((a) => a.category).filter(Boolean)));
    return ["All", ...unique];
  }, [attractions]);

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return attractions;
    return attractions.filter((a) => a.category === selectedCategory);
  }, [attractions, selectedCategory]);

  const activeAttraction = useMemo(
    () => filtered.find((a) => a.id === activeId) || filtered[0] || null,
    [filtered, activeId]
  );

  useEffect(() => {
    setActiveMediaIdx(0);
  }, [activeAttraction?.id]);

  const currentMedia = activeAttraction?.media?.[activeMediaIdx] || activeAttraction?.media?.[0];
  const fallbackPoster =
    activeAttraction?.media?.find((m) => m.type === "image")?.url || "/suite-welcome-card.jpg";

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-[#0D1017] text-center text-white">
        <div>
          <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-[#F2B749] border-t-transparent" />
          <p className="text-xs tracking-wide text-white/75">Loading local attractions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0D1017] p-6 text-center text-white">
        <div>
          <p className="text-sm text-rose-300">{error}</p>
          <button
            onClick={loadAttractions}
            className="mt-3 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!activeAttraction) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-[#0D1017] p-8 text-center text-white">
        <div>
          <Compass className="mx-auto mb-2.5 h-7 w-7 text-[#F2B749]" />
          <h2 className="text-base font-semibold">No Local Attractions Published Yet</h2>
          <p className="mt-1 text-xs text-white/65">
            Nearby sightseeing experiences curated by the resort will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col gap-2 overflow-hidden">
      {/* Compact Category Strip */}
      {categories.length > 1 && (
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                selectedCategory === cat
                  ? "bg-white text-[#0B0E16] shadow-xs"
                  : "border border-white/15 bg-white/8 text-white/75 hover:bg-white/15"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Non-Scrollable Single-Screen GTA Cinema Showcase */}
      <section className="relative flex flex-1 min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0B0E16] text-white shadow-2xl">
        {/* Full-bleed Backdrop Image / Video */}
        <div className="absolute inset-0 z-0">
          <MediaStage item={currentMedia} fallbackImage={fallbackPoster} muted={muted} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,18,0.92)_0%,rgba(10,14,24,0.72)_48%,rgba(12,16,28,0.2)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(8,10,16,0.97)_0%,rgba(8,10,16,0.58)_44%,rgba(8,10,16,0.2)_100%)]"
          />
        </div>

        {/* Top Bar Inside Stage */}
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-3.5 pt-3 sm:px-7 sm:pt-5">
          <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-white/90 backdrop-blur-md">
            <Compass className="h-3 w-3 shrink-0 text-[#F2B749]" />
            <span className="truncate">{activeAttraction.category}</span>
            {activeAttraction.distanceText && (
              <span className="truncate text-white/65">· {activeAttraction.distanceText}</span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {currentMedia?.type === "video" && !getYouTubeEmbedUrl(currentMedia.url) && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute video" : "Mute video"}
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-md hover:bg-white/20"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}
            {activeAttraction.media.length > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-1 text-[10px] text-white/90 backdrop-blur-md">
                {activeAttraction.media.some((m) => m.type === "video") ? (
                  <Film className="h-3 w-3 text-[#F2B749]" />
                ) : (
                  <ImageIcon className="h-3 w-3 text-[#F2B749]" />
                )}
                {activeMediaIdx + 1}/{activeAttraction.media.length}
              </span>
            )}
          </div>
        </div>

        {/* Middle/Lower Editorial HUD (Compact, never overflows vertically) */}
        <div className="relative z-10 flex flex-1 min-h-0 flex-col justify-end px-3.5 pb-2.5 sm:px-7 sm:pb-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-2.5 sm:gap-4">
            <div className="max-w-lg space-y-1.5 sm:space-y-2.5">
              <div className="space-y-0.5">
                <h1 className="font-sans text-xl sm:text-3xl lg:text-4xl font-bold sm:font-semibold tracking-[-0.02em] text-white leading-[1.12] line-clamp-2">
                  {activeAttraction.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  <StarRating rating={activeAttraction.rating} compact />
                  {activeAttraction.location && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] sm:text-xs text-white/75 truncate">
                      <MapPin className="h-3 w-3 text-[#F2B749] shrink-0" />
                      {activeAttraction.location}
                    </span>
                  )}
                </div>
              </div>

              {activeAttraction.description && (
                <p className="text-[11px] sm:text-xs leading-snug text-white/75 line-clamp-2">
                  {activeAttraction.description}
                </p>
              )}

              {/* Compact 3-Column Pricing Strip */}
              <div className="grid grid-cols-3 gap-1.5 max-w-md">
                <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-1.5 backdrop-blur-md">
                  <span className="flex items-center gap-1 text-[9.5px] font-medium text-white/60">
                    <Car className="h-2.5 w-2.5 text-[#F2B749] shrink-0" /> Cab
                  </span>
                  <span className="block truncate font-mono text-[11px] sm:text-xs font-bold text-white tabular-nums">
                    {activeAttraction.cabPrice !== null
                      ? formatPrice(activeAttraction.cabPrice)
                      : "On call"}
                  </span>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-1.5 backdrop-blur-md">
                  <span className="flex items-center gap-1 text-[9.5px] font-medium text-white/60">
                    <Ticket className="h-2.5 w-2.5 text-[#F2B749] shrink-0" /> Entry
                  </span>
                  <span className="block truncate font-mono text-[11px] sm:text-xs font-bold text-white tabular-nums">
                    {activeAttraction.entryFee === null
                      ? "Varies"
                      : activeAttraction.entryFee === 0
                      ? "Free"
                      : formatPrice(activeAttraction.entryFee)}
                  </span>
                </div>
                <div className="rounded-xl border border-[#F2B749]/45 bg-[#F2B749]/15 px-2.5 py-1.5 backdrop-blur-md">
                  <span className="flex items-center gap-1 text-[9.5px] font-medium text-[#FCE2A6]">
                    <Package className="h-2.5 w-2.5 shrink-0" /> Package
                  </span>
                  <span className="block truncate font-mono text-[11px] sm:text-xs font-bold text-white tabular-nums">
                    {activeAttraction.packagePrice !== null
                      ? formatPrice(activeAttraction.packagePrice)
                      : "Custom"}
                  </span>
                </div>
              </div>

              {/* Glass Pill CTA */}
              <div>
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-white/40 bg-white/12 px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/22 cursor-pointer"
                >
                  {currentMedia?.type === "video" ? (
                    <Play className="h-3 w-3 fill-white" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" />
                  )}
                  <span>Photos, Videos & Packages</span>
                </button>
              </div>
            </div>

            {/* Inline Media Reel Preview Thumbnails */}
            {activeAttraction.media.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {activeAttraction.media.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    className={cn(
                      "relative h-10 w-16 sm:h-12 sm:w-20 shrink-0 overflow-hidden rounded-lg border transition-[transform,border-color,opacity,box-shadow] duration-150 cursor-pointer btn-smooth-press-sm",
                      idx === activeMediaIdx
                        ? "border-[#F2B749] ring-1 ring-[#F2B749]/60"
                        : "border-white/25 opacity-75 hover:opacity-100"
                    )}
                    aria-label={m.caption || `Preview media ${idx + 1}`}
                  >
                    <MediaPreviewThumb item={m} fallbackImage={fallbackPoster} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Horizontal Spotlight Switcher (Fixed compact footer inside locked stage) */}
        <div className="relative z-10 shrink-0 border-t border-white/10 bg-[#080A10]/90 px-3 py-2 sm:px-7 sm:py-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/65">
            <span className="font-semibold text-white/90">
              Nearby Sightseeing ({filtered.length})
            </span>
            {roomNumber && (
              <span className="truncate">
                {contactNumber ? `Concierge · ${contactNumber}` : "Concierge · Ext 0"}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {filtered.map((spot) => {
              const isSelected = spot.id === activeAttraction.id;
              const spotFallback =
                spot.media.find((m) => m.type === "image")?.url || "/suite-welcome-card.jpg";
              const leadMedia = spot.media[0];
              const headlinePrice = spot.packagePrice ?? spot.cabPrice ?? spot.entryFee;

              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => setActiveId(spot.id)}
                  className={cn(
                    "group relative w-32 sm:w-44 shrink-0 overflow-hidden rounded-xl border text-left transition-[transform,border-color,opacity,box-shadow] duration-200 cursor-pointer btn-smooth-press",
                    isSelected
                      ? "border-white bg-white/12 ring-1 ring-[#F2B749]"
                      : "border-white/15 bg-white/5 opacity-80 hover:opacity-100 hover:border-white/40"
                  )}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                    <MediaPreviewThumb
                      item={leadMedia}
                      fallbackImage={spotFallback}
                      alt={spot.title}
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#F2B749]">
                      <Star className="h-2.5 w-2.5 fill-[#F2B749]" />
                      {Number(spot.rating).toFixed(1)}
                    </div>
                    <div className="absolute bottom-1 inset-x-1.5 flex items-end justify-between gap-1">
                      <span className="line-clamp-1 font-sans text-[10.5px] font-semibold text-white">
                        {spot.title}
                      </span>
                      {headlinePrice !== null && (
                        <span className="shrink-0 font-mono text-[9px] font-bold text-[#FCE2A6] tabular-nums">
                          {formatPrice(headlinePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full Media Gallery & Package Details Lightbox */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md"
          onClick={() => setGalleryOpen(false)}
        >
          <div
            className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-[#10141F] text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setGalleryOpen(false)}
              aria-label="Close details"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/65 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative aspect-[16/9] w-full bg-black">
              <MediaStage
                item={currentMedia}
                fallbackImage={fallbackPoster}
                muted={false}
                controls
              />
            </div>

            {activeAttraction.media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-black/40 p-2.5 no-scrollbar">
                {activeAttraction.media.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    className={cn(
                      "h-12 w-20 sm:h-14 sm:w-24 shrink-0 overflow-hidden rounded-xl border cursor-pointer",
                      idx === activeMediaIdx
                        ? "border-[#F2B749]"
                        : "border-white/20 opacity-65 hover:opacity-100"
                    )}
                  >
                    <MediaPreviewThumb item={m} fallbackImage={fallbackPoster} />
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-medium text-[#F2B749]">
                    {activeAttraction.category}
                  </span>
                  <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-white">
                    {activeAttraction.title}
                  </h2>
                  {activeAttraction.subtitle && (
                    <p className="text-xs sm:text-sm text-white/75">{activeAttraction.subtitle}</p>
                  )}
                  {activeAttraction.timings && (
                    <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-white/65">
                      <Clock className="h-3 w-3 text-[#F2B749]" />
                      {activeAttraction.timings}
                    </p>
                  )}
                </div>
                <StarRating rating={activeAttraction.rating} />
              </div>

              {activeAttraction.description && (
                <p className="text-xs sm:text-sm leading-relaxed text-white/80 whitespace-pre-line">
                  {activeAttraction.description}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-[#F2B749]" /> Cab Transfer
                  </span>
                  <span className="mt-1 block font-mono text-sm sm:text-base font-bold">
                    {activeAttraction.cabPrice !== null
                      ? formatPrice(activeAttraction.cabPrice)
                      : "On request"}
                  </span>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-[#F2B749]" /> Entry Fee
                  </span>
                  <span className="mt-1 block font-mono text-sm sm:text-base font-bold">
                    {activeAttraction.entryFee === null
                      ? "Varies"
                      : activeAttraction.entryFee === 0
                      ? "Free Entry"
                      : formatPrice(activeAttraction.entryFee)}
                  </span>
                </div>
                <div className="rounded-xl border border-[#F2B749]/40 bg-[#F2B749]/10 p-3">
                  <span className="text-[11px] text-[#FCE2A6] flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Direct Package
                  </span>
                  <span className="mt-1 block font-mono text-sm sm:text-base font-bold">
                    {activeAttraction.packagePrice !== null
                      ? formatPrice(activeAttraction.packagePrice)
                      : "Custom Quote"}
                  </span>
                  {activeAttraction.packageDetails && (
                    <span className="mt-1 block text-[11px] text-white/75">
                      {activeAttraction.packageDetails}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 p-3.5 text-xs text-white/80">
                <PhoneCall className="h-4 w-4 text-[#F2B749] shrink-0" />
                <span>
                  To book a cab or direct sightseeing package for{" "}
                  <strong className="text-white">Suite {roomNumber || "Guest"}</strong>, dial{" "}
                  <strong className="text-white">{contactNumber || "Extension 0"}</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
