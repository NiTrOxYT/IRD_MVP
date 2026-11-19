import React, { useState, useEffect, useCallback } from "react";
import {
  getPropertySettings,
  updatePropertySettings,
  getAuditLogs,
  PropertySettings,
} from "../lib/api";
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
} from "lucide-react";
import { cn } from "../lib/utils";

export function AdminSettings() {
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
        <div className="lg:col-span-1 bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs h-fit space-y-6">
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
                  Resort Tax (%)
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
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-all btn-smooth-press shadow-md mt-4 disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Operating Settings"}
            </button>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-4">
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
  );
}
