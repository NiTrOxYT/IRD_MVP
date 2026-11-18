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
} from "lucide-react";

export function AdminSettings() {
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
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
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5DDD1]">
        <span className="text-xs font-bold uppercase tracking-wider text-[#B88223]">
          Property Configuration
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#1E150F]">
          Resort & In-Room Dining Settings
        </h1>
        <p className="text-xs text-[#73685C] mt-1">
          Configure property identity, room service fee schedule, operating hours, and review staff audit history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-1 bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs h-fit space-y-6">
          <h2 className="font-serif text-lg font-bold text-[#1E150F] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#B88223]" />
            Operating Parameters
          </h2>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings updated successfully
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Property Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                  Resort Tax (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl font-mono text-[#1E150F]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                  Service Charge (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl font-mono text-[#1E150F]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                  IRD Opens
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-[#1E150F]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                  IRD Closes
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-[#1E150F]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#1E150F] mb-1">
                Concierge Contact Phone
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-[#1E150F]"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1E150F]">
                <input
                  type="checkbox"
                  checked={irdEnabled}
                  onChange={(e) => setIrdEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#B88223] focus:ring-[#B88223]"
                />
                In-Room Dining Accepting Orders
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-all cursor-pointer shadow-md mt-4 disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5DDD1]">
            <h2 className="font-serif text-lg font-bold text-[#1E150F] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#B88223]" />
              Staff Security & Operations Audit Trail
            </h2>
            <button
              onClick={() => fetchData()}
              className="p-1.5 text-[#73685C] hover:text-[#1E150F] rounded-lg transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5DDD1] text-[#73685C] font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Staff</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DDD1]/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#73685C]">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8F5EF]/50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#73685C] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1E150F]">
                        {log.staff_username || "System"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full font-mono text-[10px] bg-[#F8F5EF] border border-[#E5DDD1] text-[#825C15] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[11px] text-[#73685C]">
                        {log.target_type} #{log.target_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#73685C] text-[11px] max-w-xs truncate">
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
