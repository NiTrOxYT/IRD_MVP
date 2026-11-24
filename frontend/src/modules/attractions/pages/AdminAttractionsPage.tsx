import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  Compass,
  Edit3,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Search,
  Star,
  Ticket,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Modal } from "../../../core/ui/Modal";
import { formatINR } from "../../../core/ui/currency";
import { cn } from "../../../core/ui/utils";
import { attractionsApi } from "../api";
import type { AttractionMediaItem, LocalAttraction, LocalAttractionPayload } from "../types";

async function compressAttractionImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPG, or WebP image.");
  }
  if (file.size > 12 * 1024 * 1024) throw new Error("Image must be smaller than 12 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    for (const maxSize of [1600, 1200, 900]) {
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/webp", 0.8);
      if (dataUrl.length <= 450_000) return dataUrl;
    }
    throw new Error("Image could not be compressed small enough. Try a smaller photo or URL.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readVideoAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Choose an MP4 or WebM video file.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Uploaded video clips must be 5 MB or smaller (or paste a video/YouTube URL).");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read video file."));
    reader.readAsDataURL(file);
  });
}

const DEFAULT_FORM: LocalAttractionPayload = {
  title: "",
  subtitle: "",
  category: "Sightseeing",
  location: "",
  distanceText: "",
  description: "",
  timings: "",
  rating: 4.8,
  cabPrice: null,
  entryFee: null,
  packagePrice: null,
  packageDetails: "",
  media: [],
  isFeatured: false,
  isActive: true,
  sortOrder: 0,
};

export function AdminAttractions() {
  const [attractions, setAttractions] = useState<LocalAttraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LocalAttractionPayload>(DEFAULT_FORM);
  const [cabPriceStr, setCabPriceStr] = useState("");
  const [entryFeeStr, setEntryFeeStr] = useState("");
  const [packagePriceStr, setPackagePriceStr] = useState("");
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [mediaTypeInput, setMediaTypeInput] = useState<"image" | "video">("image");
  const [mediaError, setMediaError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAttractions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attractionsApi.listAdminAttractions();
      setAttractions(res.attractions || []);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load local attractions." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttractions();
  }, [fetchAttractions]);

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, sortOrder: attractions.length + 1 });
    setCabPriceStr("");
    setEntryFeeStr("");
    setPackagePriceStr("");
    setMediaUrlInput("");
    setMediaError("");
    setModalOpen(true);
  };

  const openEditModal = (item: LocalAttraction) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subtitle: item.subtitle || "",
      category: item.category || "Sightseeing",
      location: item.location || "",
      distanceText: item.distanceText || "",
      description: item.description || "",
      timings: item.timings || "",
      rating: Number(item.rating ?? 4.8),
      cabPrice: item.cabPrice,
      entryFee: item.entryFee,
      packagePrice: item.packagePrice,
      packageDetails: item.packageDetails || "",
      media: item.media || [],
      isFeatured: item.isFeatured,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setCabPriceStr(item.cabPrice !== null ? String(item.cabPrice) : "");
    setEntryFeeStr(item.entryFee !== null ? String(item.entryFee) : "");
    setPackagePriceStr(item.packagePrice !== null ? String(item.packagePrice) : "");
    setMediaUrlInput("");
    setMediaError("");
    setModalOpen(true);
  };

  const handleAddMediaUrl = () => {
    const trimmed = mediaUrlInput.trim();
    if (!trimmed) return;
    setMediaError("");
    setForm((prev) => ({
      ...prev,
      media: [...prev.media, { type: mediaTypeInput, url: trimmed }],
    }));
    setMediaUrlInput("");
  };

  const handleUploadFiles = async (files: FileList | null, kind: "image" | "video") => {
    if (!files || files.length === 0) return;
    setMediaError("");
    try {
      const added: AttractionMediaItem[] = [];
      for (const file of Array.from(files)) {
        const url =
          kind === "image" ? await compressAttractionImage(file) : await readVideoAsDataUrl(file);
        added.push({ type: kind, url, caption: file.name.replace(/\.[^.]+$/, "") });
      }
      setForm((prev) => ({ ...prev, media: [...prev.media, ...added].slice(0, 12) }));
    } catch (err: any) {
      setMediaError(err.message || "Failed to process media file.");
    }
  };

  const handleRemoveMedia = (idx: number) => {
    setForm((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== idx) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setMediaError("");
    try {
      const payload: LocalAttractionPayload = {
        ...form,
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || null,
        location: form.location?.trim() || null,
        distanceText: form.distanceText?.trim() || null,
        description: form.description?.trim() || null,
        timings: form.timings?.trim() || null,
        packageDetails: form.packageDetails?.trim() || null,
        rating: Math.max(0, Math.min(5, Number(form.rating) || 0)),
        cabPrice: cabPriceStr.trim() !== "" ? Number(cabPriceStr) : null,
        entryFee: entryFeeStr.trim() !== "" ? Number(entryFeeStr) : null,
        packagePrice: packagePriceStr.trim() !== "" ? Number(packagePriceStr) : null,
      };

      if (editingId) {
        await attractionsApi.updateAttraction(editingId, payload);
        showToast("success", `Updated "${payload.title}".`);
      } else {
        await attractionsApi.createAttraction(payload);
        showToast("success", `Added "${payload.title}" to Local Attractions.`);
      }
      setModalOpen(false);
      await fetchAttractions();
    } catch (err: any) {
      setMediaError(err.message || "Failed to save attraction.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: LocalAttraction) => {
    try {
      await attractionsApi.toggleAttractionStatus(item.id, { isActive: !item.isActive });
      await fetchAttractions();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update visibility.");
    }
  };

  const handleDelete = async (item: LocalAttraction) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await attractionsApi.deleteAttraction(item.id);
      showToast("success", `Removed "${item.title}".`);
      await fetchAttractions();
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete attraction.");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attractions;
    return attractions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q)
    );
  }, [attractions, search]);

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-6 border-b border-[#E5DDD1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Concierge & Sightseeing · Guest Showcase
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            Local Attractions & Nearby Spots
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Curate nearby sightseeing spots with photos, videos, cab/entry/package pricing, and 5-star ratings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttractions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#E5DDD1] text-[#1E150F] hover:bg-[#FAF8F5]"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1E150F] text-white hover:bg-[#29231F] shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#ECD7A9]" /> Add Attraction
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-2xl border text-xs flex items-center gap-2 font-medium",
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          )}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#73685C] absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search sightseeing spots, category, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] py-2.5 pl-10 pr-4 text-xs text-[#1E150F] focus:outline-none focus:border-[#B88223]"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#73685C]">Loading local attractions...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-12 text-center">
          <Compass className="w-10 h-10 text-[#B88223] mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-[#1E150F]">No Local Attractions Found</h3>
          <p className="text-xs text-[#73685C] mt-1 mb-4">
            Add sightseeing destinations with photos, videos, cab fares, and packages for guests.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#1E150F] text-white text-xs font-bold"
          >
            + Add First Attraction
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const leadImage = item.media?.find((m) => m.type === "image")?.url;
            const leadVideo = item.media?.find((m) => m.type === "video");
            const ytMatch = leadVideo?.url.match(
              /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/
            );
            const cover =
              leadImage ||
              (ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : "/suite-welcome-card.jpg");
            const videoCount = item.media?.filter((m) => m.type === "video").length || 0;
            const photoCount = item.media?.filter((m) => m.type === "image").length || 0;

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between",
                  !item.isActive && "opacity-65"
                )}
              >
                <div>
                  <div className="relative aspect-[16/9] bg-[#1E150F] overflow-hidden">
                    {!leadImage && leadVideo && !ytMatch ? (
                      <video
                        src={leadVideo.url.startsWith("data:") ? leadVideo.url : `${leadVideo.url}#t=0.5`}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img src={cover} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white">
                        {item.category}
                      </span>
                      {item.isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B88223] text-white">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#F2B749]">
                      <Star className="w-3 h-3 fill-[#F2B749]" />
                      {Number(item.rating).toFixed(1)}
                    </div>
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> {photoCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Film className="w-3 h-3" /> {videoCount}
                        </span>
                      </span>
                      {!item.isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-stone-800 text-[10px] font-semibold">
                          Hidden
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#1E150F] leading-snug">
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="text-xs text-[#73685C] mt-0.5">{item.subtitle}</p>
                      )}
                      {item.location && (
                        <p className="text-[11px] text-[#8E6314] mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {item.location}
                          {item.distanceText ? ` · ${item.distanceText}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5DDD1]/70 text-[11px]">
                      <div>
                        <span className="text-[#73685C] flex items-center gap-1">
                          <Car className="w-3 h-3" /> Cab
                        </span>
                        <strong className="font-mono text-[#1E150F]">
                          {item.cabPrice !== null ? formatINR(item.cabPrice) : "—"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#73685C] flex items-center gap-1">
                          <Ticket className="w-3 h-3" /> Entry
                        </span>
                        <strong className="font-mono text-[#1E150F]">
                          {item.entryFee !== null ? (item.entryFee === 0 ? "Free" : formatINR(item.entryFee)) : "—"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#73685C] flex items-center gap-1">
                          <Package className="w-3 h-3" /> Package
                        </span>
                        <strong className="font-mono text-[#8E6314]">
                          {item.packagePrice !== null ? formatINR(item.packagePrice) : "—"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#E5DDD1] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#73685C] hover:text-[#1E150F]"
                  >
                    {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {item.isActive ? "Visible" : "Hidden"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5DDD1] bg-white text-xs font-semibold text-[#1E150F] hover:border-[#B88223]"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Attraction Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? "Edit Local Attraction" : "Add Local Attraction"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {mediaError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-medium">
              {mediaError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Attraction Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Emerald Ridge Sunset Point"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] text-[#1E150F]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Sightseeing, Adventure, Heritage..."
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] text-[#1E150F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={form.subtitle || ""}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Panoramic cliffside vistas at sunset"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] text-[#1E150F]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                5-Star Rating (0.0 – 5.0)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, rating: s })}
                      className="p-0.5"
                      aria-label={`Set ${s} stars`}
                    >
                      <Star
                        className={cn(
                          "w-4 h-4",
                          form.rating >= s ? "fill-[#B88223] text-[#B88223]" : "text-[#D4C3A3]"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                  className="w-20 px-2.5 py-1.5 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] font-mono text-[#1E150F]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Location
              </label>
              <input
                type="text"
                value={form.location || ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="South Cliff Promenade"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Distance / Drive Time
              </label>
              <input
                type="text"
                value={form.distanceText || ""}
                onChange={(e) => setForm({ ...form, distanceText: e.target.value })}
                placeholder="8.5 km · 18 min"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Opening Timings
              </label>
              <input
                type="text"
                value={form.timings || ""}
                onChange={(e) => setForm({ ...form, timings: e.target.value })}
                placeholder="06:00 AM – 07:30 PM"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what guests will experience..."
              className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5]"
            />
          </div>

          {/* Pricing Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5]">
            <div>
              <label className="block text-[11px] font-bold text-[#1E150F] mb-1">Cab Fare (₹)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={cabPriceStr}
                onChange={(e) => setCabPriceStr(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#1E150F] mb-1">Entry Fee (₹)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={entryFeeStr}
                onChange={(e) => setEntryFeeStr(e.target.value)}
                placeholder="0 = Free"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#1E150F] mb-1">Direct Package (₹)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={packagePriceStr}
                onChange={(e) => setPackagePriceStr(e.target.value)}
                placeholder="e.g. 2800"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-white font-mono"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-[#1E150F] mb-1">
                Direct Package Includes (Optional)
              </label>
              <input
                type="text"
                value={form.packageDetails || ""}
                onChange={(e) => setForm({ ...form, packageDetails: e.target.value })}
                placeholder="e.g. Private SUV + Entry Tickets + Guided Sunset Tour"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DDD1] bg-white"
              />
            </div>
          </div>

          {/* Media Uploader (Pictures & Videos) */}
          <div className="space-y-3 p-3.5 rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                Pictures & Videos ({form.media.length}/12)
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E5DDD1] bg-white px-3 py-1.5 font-semibold text-[#1E150F] hover:border-[#B88223]">
                  <Upload className="w-3.5 h-3.5 text-[#8E6314]" /> Upload Photos
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      void handleUploadFiles(e.target.files, "image");
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E5DDD1] bg-white px-3 py-1.5 font-semibold text-[#1E150F] hover:border-[#B88223]">
                  <Film className="w-3.5 h-3.5 text-[#8E6314]" /> Upload Video (≤5MB)
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="sr-only"
                    onChange={(e) => {
                      void handleUploadFiles(e.target.files, "video");
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={mediaTypeInput}
                onChange={(e) => setMediaTypeInput(e.target.value as "image" | "video")}
                className="px-2.5 py-2 rounded-xl border border-[#E5DDD1] bg-white font-semibold"
              >
                <option value="image">Image URL</option>
                <option value="video">Video / YouTube URL</option>
              </select>
              <input
                type="url"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="Paste image, MP4, or YouTube URL..."
                className="flex-1 px-3 py-2 rounded-xl border border-[#E5DDD1] bg-white"
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="px-3.5 py-2 rounded-xl bg-[#1E150F] text-white font-semibold"
              >
                Add
              </button>
            </div>

            {form.media.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {form.media.map((m, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-[#E5DDD1] bg-black aspect-[16/10]">
                    {m.type === "video" ? (
                      <>
                        {(() => {
                          const yt = m.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
                          return yt ? (
                            <img src={`https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <video src={m.url.startsWith("data:") ? m.url : `${m.url}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          );
                        })()}
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                          <Film className="w-5 h-5 text-[#F2B749]" />
                        </span>
                      </>
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-red-600"
                      aria-label="Remove media"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 font-semibold text-[#1E150F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded text-[#B88223]"
                />
                Visible to Guests
              </label>
              <label className="flex items-center gap-2 font-semibold text-[#1E150F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="rounded text-[#B88223]"
                />
                Featured First
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#73685C]">Sort Order</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-16 px-2.5 py-1.5 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5DDD1] flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#E5DDD1] font-semibold text-[#73685C]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#1E150F] text-white font-bold shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Attraction"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
