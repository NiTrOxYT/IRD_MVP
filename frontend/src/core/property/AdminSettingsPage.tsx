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
} from "lucide-react";
import { cn } from "../ui/utils";
import { DEFAULT_WELCOME_MESSAGE } from "../stay/GuestWelcomeLetter";

async function compressImage(
  file: File,
  { maxSizes, quality, maxChars, errorLabel }: { maxSizes: number[]; quality: number; maxChars: number; errorLabel: string }
): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPG, or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("The image must be smaller than 10 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (image.naturalWidth > 12000 || image.naturalHeight > 12000) {
      throw new Error(`This image is too large to process. Choose a smaller ${errorLabel}.`);
    }

    for (const maxSize of maxSizes) {
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/webp", quality);
      if (dataUrl.length <= maxChars) return dataUrl;
    }
    throw new Error(`This ${errorLabel} could not be compressed enough. Choose a simpler image.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
          maxSizes: [1440, 1080, 768],
          quality: 0.78,
          maxChars: 340_000,
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
                      PNG, JPG, or WebP · automatically compressed for mobile suite displays.
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
