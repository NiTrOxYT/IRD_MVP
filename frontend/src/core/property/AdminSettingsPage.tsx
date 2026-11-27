import React, { useState, useEffect, useCallback } from "react";
import { getPropertySettings, updatePropertySettings, getAuditLogs } from "./propertyApi";
import type { PropertySettings } from "./propertyTypes";
import {
  Settings,
  ShieldAlert,
  Clock,
  DollarSign,
  Percent,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  Upload,
  Trash2,
  MessageCircle,
  ExternalLink,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import { cn } from "../ui/utils";
import { compressImage, readVideoAsDataUrl } from "../ui/imageUtils";
import { DEFAULT_WELCOME_MESSAGE } from "../stay/GuestWelcomeLetter";
import { DEFAULT_LANDING_VIDEO_URL } from "../stay/GuestServiceHub";
import {
  buildAttractionWhatsappMessage,
  buildAttractionWhatsappUrl,
  DEFAULT_ATTRACTION_WHATSAPP_TEMPLATE,
} from "../../modules/attractions/whatsapp";

type PortalImageKey =
  | "diningHeroUrl"
  | "roomServiceHeroUrl"
  | "attractionsHeroUrl"
  | "suiteLoaderBgUrl";

const PORTAL_IMAGE_SLOTS: ReadonlyArray<{
  key: PortalImageKey;
  label: string;
  defaultSrc: string;
  hint: string;
}> = [
  {
    key: "diningHeroUrl",
    label: "In-Room Dining Hero",
    defaultSrc: "/in-room-dining-card.jpg",
    hint: "Shown in Home Dining spotlight & In-Room Dining promo banner.",
  },
  {
    key: "roomServiceHeroUrl",
    label: "Suite Care / Room Service Hero",
    defaultSrc: "/room-service-card.jpg",
    hint: "Shown in Home Care spotlight & Suite Care header card.",
  },
  {
    key: "attractionsHeroUrl",
    label: "Explore Attractions Hero",
    defaultSrc: "/suite-welcome-card.jpg",
    hint: "Shown in Home Explore spotlight & Local Attractions hub tile.",
  },
  {
    key: "suiteLoaderBgUrl",
    label: "Suite Loading Scene Backdrop",
    defaultSrc: "/suite-loader-scene.jpg",
    hint: "Full-screen welcome verification backdrop shown while suite loads.",
  },
];

export function AdminSettings() {
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoDraft, setLogoDraft] = useState<string | null | undefined>(undefined);
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [logoSaved, setLogoSaved] = useState(false);

  // Welcome Letter settings
  const [welcomeMode, setWelcomeMode] = useState<"every_time" | "once_per_stay" | "disabled">("every_time");
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME_MESSAGE);
  const [welcomeBgDraft, setWelcomeBgDraft] = useState<string | null | undefined>(undefined);
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [welcomeSaved, setWelcomeSaved] = useState(false);
  const [welcomeError, setWelcomeError] = useState("");

  // Attractions WhatsApp booking settings
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [attractionTemplate, setAttractionTemplate] = useState(DEFAULT_ATTRACTION_WHATSAPP_TEMPLATE);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [whatsappError, setWhatsappError] = useState("");

  // Portal & Service Hero Images
  const [portalImagesDraft, setPortalImagesDraft] = useState<
    Partial<Record<PortalImageKey, string | null>>
  >({});
  const [portalImagesSaving, setPortalImagesSaving] = useState(false);
  const [portalImagesSaved, setPortalImagesSaved] = useState(false);
  const [portalImagesError, setPortalImagesError] = useState("");

  // Landing Welcome Loop Video
  const [landingVideoDraft, setLandingVideoDraft] = useState<string | null | undefined>(undefined);
  const [landingVideoSaving, setLandingVideoSaving] = useState(false);
  const [landingVideoSaved, setLandingVideoSaved] = useState(false);
  const [landingVideoError, setLandingVideoError] = useState("");

  // Form
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [taxRate, setTaxRate] = useState("10.00");
  const [serviceCharge, setServiceCharge] = useState("5.00");
  const [openingTime, setOpeningTime] = useState("06:00");
  const [closingTime, setClosingTime] = useState("23:30");
  const [irdEnabled, setIrdEnabled] = useState(true);
  const [contactNumber, setContactNumber] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, logsRes] = await Promise.all([
        getPropertySettings(),
        getAuditLogs().catch(() => ({ logs: [] })),
      ]);

      const prop = settingsRes.property;
      setSettings(prop);
      setName(prop.name);
      setCurrency(prop.currency);
      setTaxRate(String(prop.taxRatePercent));
      setServiceCharge(String(prop.serviceChargePercent));
      setOpeningTime(prop.openingTime);
      setClosingTime(prop.closingTime);
      setIrdEnabled(prop.irdEnabled);
      setContactNumber(prop.contactNumber || "");
      setWelcomeMode(prop.welcomeMode || "every_time");
      setWelcomeMessage(prop.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE);
      setWelcomeBgDraft(undefined);
      setPortalImagesDraft({});
      setLandingVideoDraft(undefined);
      setWhatsappNumber(prop.whatsappNumber || "");
      setAttractionTemplate(prop.attractionBookingTemplate ?? DEFAULT_ATTRACTION_WHATSAPP_TEMPLATE);

      setAuditLogs(logsRes.logs);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await updatePropertySettings({
        name: name.trim(),
        currency: currency.trim(),
        taxRatePercent: Number(taxRate),
        serviceChargePercent: Number(serviceCharge),
        openingTime,
        closingTime,
        irdEnabled,
        contactNumber: contactNumber.trim() || undefined,
      });

      setSettings(res.property);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      await fetchData();
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (file?: File) => {
    if (!file) return;
    setLogoError("");
    setLogoSaved(false);
    try {
      setLogoDraft(
        await compressImage(file, {
          maxSizes: [512, 384, 256],
          quality: 0.72,
          maxChars: 70_000,
          errorLabel: "logo",
        })
      );
    } catch (err: any) {
      setLogoError(err.message || "Could not process this image.");
    }
  };

  const handleWelcomeBgFile = async (file?: File) => {
    if (!file) return;
    setWelcomeError("");
    setWelcomeSaved(false);
    try {
      setWelcomeBgDraft(
        await compressImage(file, {
          maxSizes: [1440, 1080, 800, 640],
          quality: 0.8,
          maxChars: 700_000,
          errorLabel: "background image",
        })
      );
    } catch (err: any) {
      setWelcomeError(err.message || "Could not process this image.");
    }
  };

  const handleSaveWelcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setWelcomeSaving(true);
    setWelcomeError("");
    setWelcomeSaved(false);
    try {
      const res = await updatePropertySettings({
        welcomeMode,
        welcomeMessage: welcomeMessage.trim() || null,
        ...(welcomeBgDraft !== undefined ? { welcomeBgUrl: welcomeBgDraft } : {}),
      });
      setSettings(res.property);
      setWelcomeBgDraft(undefined);
      setWelcomeSaved(true);
      setTimeout(() => setWelcomeSaved(false), 3000);
    } catch (err: any) {
      setWelcomeError(err.message || "Failed to save welcome page settings.");
    } finally {
      setWelcomeSaving(false);
    }
  };

  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappSaving(true);
    setWhatsappError("");
    setWhatsappSaved(false);
    try {
      const res = await updatePropertySettings({
        whatsappNumber: whatsappNumber.trim() || null,
        attractionBookingTemplate: attractionTemplate.trim() || null,
      });
      setSettings(res.property);
      setWhatsappNumber(res.property.whatsappNumber || "");
      setWhatsappSaved(true);
      setTimeout(() => setWhatsappSaved(false), 3000);
    } catch (err: any) {
      setWhatsappError(err.message || "Failed to save WhatsApp booking settings.");
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleSaveLogo = async () => {
    if (logoDraft === undefined) return;
    setLogoSaving(true);
    setLogoError("");
    try {
      const res = await updatePropertySettings({ logoUrl: logoDraft });
      setSettings(res.property);
      window.dispatchEvent(new CustomEvent("property-logo-updated", { detail: logoDraft }));
      setLogoDraft(undefined);
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 3000);
    } catch (err: any) {
      setLogoError(err.message || "Failed to save the logo.");
    } finally {
      setLogoSaving(false);
    }
  };

  const handlePortalImageFile = async (key: PortalImageKey, file?: File) => {
    if (!file) return;
    setPortalImagesError("");
    setPortalImagesSaved(false);
    try {
      const compressed = await compressImage(file, {
        maxSizes: [1440, 1080, 800, 640],
        quality: 0.8,
        maxChars: 700_000,
        errorLabel: "hero image",
      });
      setPortalImagesDraft((prev) => ({ ...prev, [key]: compressed }));
    } catch (err: any) {
      setPortalImagesError(err.message || "Could not process this image.");
    }
  };

  const handleSavePortalImages = async () => {
    if (Object.keys(portalImagesDraft).length === 0) return;
    setPortalImagesSaving(true);
    setPortalImagesError("");
    setPortalImagesSaved(false);
    try {
      const res = await updatePropertySettings(portalImagesDraft);
      setSettings(res.property);
      window.dispatchEvent(
        new CustomEvent("property-branding-updated", {
          detail: {
            suiteLoaderBgUrl: res.property.suiteLoaderBgUrl ?? null,
          },
        })
      );
      setPortalImagesDraft({});
      setPortalImagesSaved(true);
      setTimeout(() => setPortalImagesSaved(false), 3000);
    } catch (err: any) {
      setPortalImagesError(err.message || "Failed to save portal images.");
    } finally {
      setPortalImagesSaving(false);
    }
  };

  const handleLandingVideoFile = async (file?: File) => {
    if (!file) return;
    setLandingVideoError("");
    setLandingVideoSaved(false);
    try {
      const dataUrl = await readVideoAsDataUrl(file, 5.5);
      setLandingVideoDraft(dataUrl);
    } catch (err: any) {
      setLandingVideoError(err.message || "Could not process this video file.");
    }
  };

  const handleSaveLandingVideo = async () => {
    if (landingVideoDraft === undefined) return;
    setLandingVideoSaving(true);
    setLandingVideoError("");
    setLandingVideoSaved(false);
    try {
      const cleanVal = landingVideoDraft ? landingVideoDraft.trim() || null : null;
      const res = await updatePropertySettings({ landingVideoUrl: cleanVal });
      setSettings(res.property);
      setLandingVideoDraft(undefined);
      setLandingVideoSaved(true);
      setTimeout(() => setLandingVideoSaved(false), 3000);
    } catch (err: any) {
      setLandingVideoError(err.message || "Failed to save landing welcome video.");
    } finally {
      setLandingVideoSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header matching Cafe Command Center */}
      <div className="pb-6 border-b border-[#E5DDD1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Property Configuration · Operations
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            Resort & In-Room Dining Settings
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Configure property branding, room service tax schedules, operating hours, and inspect security audit trails.
          </p>
        </div>
        <div>
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#E5DDD1] text-[#1E150F] hover:bg-[#FAF8F5] shadow-2xs btn-smooth-press"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-1 space-y-6">
        <section className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#E5DDD1]">
            <h2 className="font-serif text-xl font-bold text-[#1E150F]">Property Logo</h2>
            <p className="mt-1 text-xs text-[#73685C]">Upload a logo to use across guest and staff screens.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] p-2">
              {(logoDraft === undefined ? settings?.logoUrl : logoDraft) ? (
                <img src={logoDraft === undefined ? settings?.logoUrl || undefined : logoDraft || undefined} alt="Property logo preview" className="h-full w-full object-contain" />
              ) : <Sparkles className="h-7 w-7 text-[#B88223]" />}
            </div>
            <div className="min-w-0 space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1E150F] hover:bg-[#F2EBE1]">
                <Upload className="h-4 w-4 text-[#8E6314]" /> Choose logo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { void handleLogoFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              </label>
              <p className="text-[10px] text-[#73685C]">PNG, JPG, or WebP · up to 10 MB</p>
            </div>
          </div>
          {logoError && <p role="alert" className="text-xs text-red-700">{logoError}</p>}
          {logoSaved && <p role="status" className="text-xs font-medium text-emerald-700">Logo updated successfully.</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => void handleSaveLogo()} disabled={logoDraft === undefined || logoSaving} className="flex-1 rounded-xl bg-[#1E150F] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#39271C] disabled:cursor-not-allowed disabled:opacity-45">
              {logoSaving ? "Saving logo…" : "Save Logo"}
            </button>
            {(logoDraft !== undefined ? logoDraft !== null : !!settings?.logoUrl) && (
              <button type="button" onClick={() => { setLogoDraft(null); setLogoError(""); setLogoSaved(false); }} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DDD1] px-3 py-2 text-xs font-semibold text-[#73685C] hover:bg-[#FAF8F5]">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
        </section>
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs h-fit space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5DDD1]">
            <h2 className="font-serif text-xl font-bold text-[#1E150F] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#B88223]" />
              <span>Operating Schedule</span>
            </h2>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 font-medium shadow-2xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Resort dining settings updated successfully</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Resort Property Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                  GST / Tax (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl font-mono text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                  Service Charge (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl font-mono text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                  required
                />
              </div>
            </div>
            <p className="-mt-1 text-[11px] text-[#73685C]">Set either rate to 0 to disable it. Enabled charges appear in guest order history.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                  IRD Service Opens
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                  IRD Service Closes
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Front Desk Dial Contact
              </label>
              <input
                type="text"
                placeholder="Extension 0"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
            </div>

            <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1] mt-2">
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-xs text-[#1E150F]">
                <input
                  type="checkbox"
                  checked={irdEnabled}
                  onChange={(e) => setIrdEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#B88223] focus:ring-[#B88223]"
                />
                <span>In-Room Dining Accepting Orders</span>
              </label>
              <p className="text-[10px] text-[#73685C] mt-1 pl-6">
                When unchecked, guests are notified that room service is temporarily paused.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-[transform,background-color,box-shadow] duration-150 btn-smooth-press shadow-md mt-4 disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Operating Settings"}
            </button>
          </form>
        </div>
        </div>

        {/* Right Column: Guest Welcome Letter + Audit Log */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Welcome Letter Configuration */}
          <section className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-[#E5DDD1]">
              <h2 className="font-serif text-xl font-bold text-[#1E150F]">Guest Welcome Letter</h2>
              <p className="text-xs text-[#73685C] mt-0.5">
                Shown immediately after the suite loading screen. Customize display frequency, letter copy, and backdrop.
              </p>
            </div>

            {welcomeSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Welcome letter settings updated successfully.</span>
              </div>
            )}
            {welcomeError && (
              <p role="alert" className="text-xs text-red-700 font-medium">
                {welcomeError}
              </p>
            )}

            <form onSubmit={handleSaveWelcome} className="space-y-5 text-xs">
              {/* Display Frequency */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                  When to show welcome page
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      value: "every_time" as const,
                      label: "Show every visit",
                      desc: "Appears after loading screen on every open",
                    },
                    {
                      value: "once_per_stay" as const,
                      label: "Once per stay",
                      desc: "Shown only on the guest's first visit",
                    },
                    {
                      value: "disabled" as const,
                      label: "Off",
                      desc: "Go straight to suite services",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWelcomeMode(opt.value)}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-colors",
                        welcomeMode === opt.value
                          ? "border-[#B88223] bg-[#FAF3E6] text-[#1E150F]"
                          : "border-[#E5DDD1] bg-[#FAF8F5] text-[#73685C] hover:border-[#D4A84D]"
                      )}
                    >
                      <span className="block font-semibold text-xs text-[#1E150F]">{opt.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Image Picker */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                  Welcome Letter Background Image
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="h-28 w-full sm:w-48 shrink-0 overflow-hidden rounded-2xl border border-[#E5DDD1] bg-[#241811]">
                    <img
                      src={
                        welcomeBgDraft === undefined
                          ? settings?.welcomeBgUrl || "/suite-welcome-card.jpg"
                          : welcomeBgDraft || "/suite-welcome-card.jpg"
                      }
                      alt="Welcome background preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1E150F] hover:bg-[#F2EBE1]">
                        <Upload className="h-4 w-4 text-[#8E6314]" /> Upload Background
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            void handleWelcomeBgFile(e.target.files?.[0]);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {(welcomeBgDraft !== undefined ? welcomeBgDraft !== null : !!settings?.welcomeBgUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            setWelcomeBgDraft(null);
                            setWelcomeError("");
                            setWelcomeSaved(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DDD1] px-3 py-2 text-xs font-semibold text-[#73685C] hover:bg-[#FAF8F5]"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Reset Default
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#73685C]">
                      PNG, JPG, or WebP · Max 10 MB (up to 12000×12000 px) · auto-compressed to WebP/JPEG ≤ 500 KB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Welcome Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                    Welcome Letter Message
                  </label>
                  <span className="text-[11px] text-[#8E6314] font-medium">
                    Starts automatically with: Dear {"{Guest Name}"},
                  </span>
                </div>
                <div className="rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#E5DDD1] bg-[#FAF3E6]/60 font-serif text-sm font-semibold text-[#1E150F]">
                    Dear {"{Guest Name}"},
                  </div>
                  <textarea
                    rows={5}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder={DEFAULT_WELCOME_MESSAGE}
                    className="w-full px-4 py-3 bg-transparent text-xs leading-relaxed text-[#1E150F] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={welcomeSaving}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-colors shadow-sm disabled:opacity-50"
              >
                {welcomeSaving ? "Saving Welcome Letter..." : "Save Welcome Letter"}
              </button>
            </form>
          </section>

          {/* Local Attractions WhatsApp Booking Configuration */}
          <section className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5DDD1]">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1E150F] flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-700" />
                  <span>Attractions WhatsApp Booking</span>
                </h2>
                <p className="text-xs text-[#73685C] mt-0.5">
                  Configure the resort WhatsApp concierge number and dynamic booking message opened by every Local Attractions package button.
                </p>
              </div>
            </div>

            {whatsappSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>WhatsApp booking settings updated successfully.</span>
              </div>
            )}
            {whatsappError && (
              <p role="alert" className="text-xs text-red-700 font-medium">
                {whatsappError}
              </p>
            )}

            <form onSubmit={handleSaveWhatsapp} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                  Resort Concierge WhatsApp Number (with country code)
                </label>
                <input
                  type="tel"
                  placeholder="+918100318327"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl font-mono text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                />
                <p className="mt-1 text-[11px] text-[#73685C]">
                  Opens <code className="text-[#8E6314]">https://wa.me/&lt;number&gt;?text=...</code> directly in the guest's WhatsApp app.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                    Dynamic WhatsApp Message Template
                  </label>
                  <button
                    type="button"
                    onClick={() => setAttractionTemplate(DEFAULT_ATTRACTION_WHATSAPP_TEMPLATE)}
                    className="text-[11px] font-semibold text-[#8E6314] hover:underline"
                  >
                    Reset default template
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={attractionTemplate}
                  onChange={(e) => setAttractionTemplate(e.target.value)}
                  placeholder={DEFAULT_ATTRACTION_WHATSAPP_TEMPLATE}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs leading-relaxed text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[#73685C] mr-1">Insert variable:</span>
                  {[
                    "{{attraction}}",
                    "{{package}}",
                    "{{price}}",
                    "{{room}}",
                    "{{guest}}",
                    "{{location}}",
                  ].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() =>
                        setAttractionTemplate((prev) =>
                          prev.endsWith(" ") || prev === "" ? `${prev}${token}` : `${prev} ${token}`
                        )
                      }
                      className="rounded-lg border border-[#ECD7A9] bg-[#FAF3E6] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#8E6314] hover:bg-[#F2E5CA] btn-smooth-press-sm"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Message & Link Preview */}
              <div className="rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] p-3.5 space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#73685C]">
                  Live Guest Message Preview
                </span>
                <p className="text-xs text-[#1E150F] leading-relaxed">
                  {buildAttractionWhatsappMessage(attractionTemplate, {
                    attraction: "Tiger Hill Sunrise Point",
                    category: "Viewpoints",
                    packageName: "Direct Package",
                    price: "₹2,500",
                    room: "302",
                    guest: "Sourik",
                    location: "Darjeeling Ridge",
                  })}
                </p>
                {whatsappNumber.trim() && (
                  <a
                    href={
                      buildAttractionWhatsappUrl(whatsappNumber, attractionTemplate, {
                        attraction: "Tiger Hill Sunrise Point",
                        packageName: "Direct Package",
                        price: "₹2,500",
                        room: "302",
                        guest: "Sourik",
                      }) || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 pt-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    <span>Test wa.me link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <button
                type="submit"
                disabled={whatsappSaving}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-colors shadow-sm disabled:opacity-50 btn-smooth-press"
              >
                {whatsappSaving ? "Saving WhatsApp Settings..." : "Save WhatsApp Settings"}
              </button>
            </form>
          </section>

          {/* Portal & Service Hero Images Configuration */}
          <section className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5DDD1]">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1E150F] flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#B88223]" />
                  <span>Guest Portal & Service Images</span>
                </h2>
                <p className="text-xs text-[#73685C] mt-0.5">
                  Customize every hero photo shown across Guest Home, In-Room Dining, Suite Care, Explore, and Arrival Loader.
                </p>
              </div>
              {Object.keys(portalImagesDraft).length > 0 && (
                <button
                  type="button"
                  onClick={handleSavePortalImages}
                  disabled={portalImagesSaving}
                  className="shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-colors shadow-sm disabled:opacity-50 btn-smooth-press"
                >
                  {portalImagesSaving ? "Saving Images..." : "Save Portal Images"}
                </button>
              )}
            </div>

            {portalImagesSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Guest portal & service hero images saved.</span>
              </div>
            )}
            {portalImagesError && (
              <p role="alert" className="text-xs text-red-700 font-medium">
                {portalImagesError}
              </p>
            )}

            <div className="rounded-2xl border border-[#E5DDD1] bg-[#FAF3E6]/70 px-4 py-3 text-[11px] text-[#5B4D42] flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <strong className="text-[#1E150F]">Formats:</strong> PNG, JPG, or WebP
              </span>
              <span>
                <strong className="text-[#1E150F]">Max upload:</strong> 10 MB (up to 12000×12000 px)
              </span>
              <span>
                <strong className="text-[#1E150F]">Recommended:</strong> 16:9 or 4:3 landscape · auto-compressed to WebP/JPEG ≤ 500 KB
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PORTAL_IMAGE_SLOTS.map((slot) => {
                const draftVal = portalImagesDraft[slot.key];
                const savedVal = settings?.[slot.key] ?? null;
                const currentPreview =
                  draftVal !== undefined ? draftVal || slot.defaultSrc : savedVal || slot.defaultSrc;
                const hasCustom = draftVal !== undefined ? draftVal !== null : Boolean(savedVal);

                return (
                  <div
                    key={slot.key}
                    className="rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#1E150F]">{slot.label}</p>
                        <p className="text-[11px] text-[#73685C] mt-0.5">{slot.hint}</p>
                      </div>
                    </div>

                    <div className="h-28 w-full overflow-hidden rounded-xl border border-[#E5DDD1] bg-[#241811]">
                      <img
                        src={currentPreview}
                        alt={slot.label}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E5DDD1] bg-white px-3 py-1.5 text-xs font-semibold text-[#1E150F] hover:bg-[#F2EBE1]">
                        <Upload className="h-3.5 w-3.5 text-[#8E6314]" /> Upload
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            void handlePortalImageFile(slot.key, e.target.files?.[0]);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() => {
                            setPortalImagesDraft((prev) => ({ ...prev, [slot.key]: null }));
                            setPortalImagesError("");
                            setPortalImagesSaved(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DDD1] bg-white px-3 py-1.5 text-xs font-semibold text-[#73685C] hover:bg-[#FAF8F5]"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(portalImagesDraft).length > 0 && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePortalImages}
                  disabled={portalImagesSaving}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-colors shadow-sm disabled:opacity-50 btn-smooth-press"
                >
                  {portalImagesSaving ? "Saving Images..." : "Save Portal Images"}
                </button>
              </div>
            )}
          </section>

          {/* Landing Welcome Video Configuration */}
          <section className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#E5DDD1]">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1E150F] flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#B88223]" />
                  <span>Home Page Loop Video</span>
                </h2>
                <p className="text-xs text-[#73685C] mt-0.5">
                  Plays silently in a continuous loop at the top of the main Guest Home &amp; Services landing page.
                </p>
              </div>
              {landingVideoDraft !== undefined && (
                <button
                  type="button"
                  onClick={handleSaveLandingVideo}
                  disabled={landingVideoSaving}
                  className="shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-colors shadow-sm disabled:opacity-50 btn-smooth-press cursor-pointer"
                >
                  {landingVideoSaving ? "Saving Video..." : "Save Landing Video"}
                </button>
              )}
            </div>

            {landingVideoSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Landing welcome video updated successfully.</span>
              </div>
            )}
            {landingVideoError && (
              <p role="alert" className="text-xs text-red-700 font-medium">
                {landingVideoError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-5 aspect-video w-full overflow-hidden rounded-2xl border border-[#E5DDD1] bg-[#180E09]">
                <video
                  key={
                    landingVideoDraft !== undefined
                      ? landingVideoDraft || DEFAULT_LANDING_VIDEO_URL
                      : settings?.landingVideoUrl || DEFAULT_LANDING_VIDEO_URL
                  }
                  src={
                    landingVideoDraft !== undefined
                      ? landingVideoDraft || DEFAULT_LANDING_VIDEO_URL
                      : settings?.landingVideoUrl || DEFAULT_LANDING_VIDEO_URL
                  }
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="md:col-span-7 space-y-3 text-xs">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E5DDD1] bg-[#FAF8F5] px-3.5 py-2 text-xs font-semibold text-[#1E150F] hover:bg-[#F2EBE1]">
                    <Upload className="h-3.5 w-3.5 text-[#8E6314]" /> Upload Video
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="sr-only"
                      onChange={(e) => {
                        void handleLandingVideoFile(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  {(landingVideoDraft !== undefined
                    ? landingVideoDraft !== null
                    : Boolean(settings?.landingVideoUrl)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLandingVideoDraft(null);
                        setLandingVideoError("");
                        setLandingVideoSaved(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DDD1] bg-white px-3.5 py-2 text-xs font-semibold text-[#73685C] hover:bg-[#FAF8F5] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Reset Default
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                    Or Video URL (MP4 / WebM)
                  </label>
                  <input
                    type="text"
                    placeholder="https://... or /landing-welcome.mp4"
                    value={
                      landingVideoDraft !== undefined
                        ? landingVideoDraft?.startsWith("data:")
                          ? ""
                          : landingVideoDraft || ""
                        : settings?.landingVideoUrl?.startsWith("data:")
                        ? ""
                        : settings?.landingVideoUrl || ""
                    }
                    onChange={(e) => {
                      setLandingVideoDraft(e.target.value || null);
                      setLandingVideoError("");
                      setLandingVideoSaved(false);
                    }}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                  />
                </div>

                <p className="text-[11px] text-[#73685C]">
                  Supports MP4, WebM, or MOV up to 5.5 MB upload (or paste any HTTPS MP4 URL for larger clips).
                </p>
              </div>
            </div>
          </section>

          {/* Audit Log Table */}
          <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5DDD1]">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1E150F] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#B88223]" />
                <span>Security & Operations Audit Trail</span>
              </h2>
              <p className="text-xs text-[#73685C] mt-0.5">
                Cryptographic immutable log of staff status transitions, checkout revocations, and configuration edits.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5DDD1] text-[#73685C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Staff Identity</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Target Scope</th>
                  <th className="py-3 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DDD1]/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#73685C]">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-[#73685C] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#1E150F]">
                        {log.staff_username || "System Worker"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-[#FAF3E6] border border-[#ECD7A9] text-[#8E6314] font-bold shadow-2xs">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 uppercase text-[10px] font-semibold text-[#73685C]">
                        {log.target_type} #{log.target_id}
                      </td>
                      <td className="py-3 px-3 text-[#73685C] text-[11px] max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
