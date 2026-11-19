import React, { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { listStays, listRooms, checkinStay, checkoutStay, revokeStay, Stay, Room } from "../lib/api";
import { Modal } from "../components/Modal";
import { onStayCreated, onStayInvalidated } from "../lib/socket";
import {
  QrCode,
  UserPlus,
  DoorOpen,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Building,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";

export function AdminStays() {
  const [stays, setStays] = useState<Stay[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Check-in modal
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | "">("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Modal
  const [qrModalStay, setQrModalStay] = useState<Stay | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [staysRes, roomsRes] = await Promise.all([listStays(), listRooms()]);
      setStays(staysRes.stays);
      setRooms(roomsRes.rooms);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const unsubCreated = onStayCreated(() => fetchData());
    const unsubInvalidated = onStayInvalidated(() => fetchData());

    return () => {
      unsubCreated();
      unsubInvalidated();
    };
  }, [fetchData]);

  const handleOpenQR = async (stay: Stay) => {
    setQrModalStay(stay);
    const accessUrl = `${window.location.origin}/stay?token=${stay.stay_token}`;
    try {
      const url = await QRCode.toDataURL(accessUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#1E150F",
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("QR generation failed", err);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !guestName.trim()) {
      alert("Please select a room and enter the guest's name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await checkinStay({
        roomId: Number(selectedRoomId),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsCheckinOpen(false);
      setSelectedRoomId("");
      setGuestName("");
      setGuestPhone("");
      setNotes("");
      await fetchData();
    } catch (err: any) {
      alert("Check-in failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async (stayId: number, roomNumber: string) => {
    if (
      !window.confirm(
        `Are you sure you want to check out Suite ${roomNumber}? This will immediately invalidate guest in-room dining access.`
      )
    ) {
      return;
    }

    try {
      await checkoutStay(stayId);
      await fetchData();
    } catch (err: any) {
      alert("Checkout failed: " + err.message);
    }
  };

  const activeStays = stays.filter((s) => s.status === "active");

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Header matching Cafe Command Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DDD1]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Front Desk Operations · Stay Credentialing
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            Guest Stays & Room Access
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Provision revocable room dining QR credentials and enforce checkout access invalidation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#E5DDD1] text-[#1E150F] hover:bg-[#FAF8F5] shadow-2xs btn-smooth-press"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsCheckinOpen(true)}
            className="inline-flex items-center gap-2 py-2.5 px-4 bg-[#1E150F] hover:bg-[#29231F] text-white rounded-xl text-xs font-bold shadow-md btn-smooth-press cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#B88223]" />
            <span>Check In New Guest</span>
          </button>
        </div>
      </div>

      {/* Active Stays Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-[#1E150F] flex items-center gap-2">
            <span>Active Suite Stays</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
              {activeStays.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-[#73685C]">
            <div className="w-8 h-8 rounded-full border-3 border-[#B88223] border-t-transparent animate-spin mx-auto mb-3" />
            <span>Loading stay records...</span>
          </div>
        ) : activeStays.length === 0 ? (
          <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-12 text-center max-w-md mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] text-[#B88223] flex items-center justify-center mx-auto mb-3 border border-[#E5DDD1]">
              <DoorOpen className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-base font-bold text-[#1E150F]">No Active Stays</h3>
            <p className="text-xs text-[#73685C] mb-4">
              Check in a guest to generate revocable room dining credentials.
            </p>
            <button
              onClick={() => setIsCheckinOpen(true)}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#1E150F] text-white btn-smooth-press shadow-xs"
            >
              Check In Guest
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeStays.map((stay) => (
              <div
                key={stay.id}
                className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-5 shadow-xs flex flex-col justify-between card-smooth-press"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-serif text-xl font-bold text-[#1E150F] block">
                        Suite {stay.room_number}
                      </span>
                      <span className="text-xs text-[#73685C]">{stay.wing || "Resort Wing"}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Active Stay
                    </span>
                  </div>

                  <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1]/70 space-y-2 text-xs my-3">
                    <div className="flex justify-between">
                      <span className="text-[#73685C]">Guest Name</span>
                      <span className="font-bold text-[#1E150F]">{stay.guest_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#73685C]">Check-in</span>
                      <span className="font-mono">{new Date(stay.check_in_at).toLocaleDateString()}</span>
                    </div>
                    {stay.notes && (
                      <div className="pt-2 border-t border-[#E5DDD1] text-[11px] text-[#8E6314] italic">
                        "{stay.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#E5DDD1] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenQR(stay)}
                    className="py-2 px-3.5 bg-[#1E150F] hover:bg-[#29231F] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 btn-smooth-press shadow-xs cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#B88223]" /> Room QR
                  </button>

                  <button
                    onClick={() => handleCheckout(stay.id, stay.room_number)}
                    className="py-2 px-3.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1 btn-smooth-press cursor-pointer border border-red-200"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Check Out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Check-In Modal */}
      <Modal
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        title="Check In Guest Stay"
        description="Assign room, guest profile, and issue digital dining credentials"
      >
        <form onSubmit={handleCheckin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Select Suite / Room
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(Number(e.target.value) || "")}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              required
            >
              <option value="">-- Choose an available room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Suite {r.room_number} ({r.wing || "Standard"} {r.floor ? `· Floor ${r.floor}` : ""}){" "}
                  {r.active_stay_id ? "⚠️ Occupied" : "✓ Vacant"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Guest Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Lady Genevieve Vance"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Contact Phone (Optional)
            </label>
            <input
              type="tel"
              placeholder="e.g. +1 (555) 019-2831"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Special Preferences & Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Anniversary celebration, sparkling water in suite, severe peanut allergy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E5DDD1]">
            <button
              type="button"
              onClick={() => setIsCheckinOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#73685C] hover:bg-[#FAF8F5] rounded-xl btn-smooth-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E150F] hover:bg-[#29231F] rounded-xl shadow-md btn-smooth-press cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Generating Credentials..." : "Complete Check-In"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Room QR Modal */}
      <Modal
        isOpen={Boolean(qrModalStay)}
        onClose={() => setQrModalStay(null)}
        title={qrModalStay ? `Suite ${qrModalStay.room_number} Dining Access QR` : ""}
        description="Print or display for in-room guest ordering"
      >
        {qrModalStay && (
          <div className="text-center space-y-4">
            <p className="text-xs text-[#73685C]">
              Scan with mobile device camera to open In-Room Dining for{" "}
              <span className="font-bold text-[#1E150F]">{qrModalStay.guest_name}</span>.
            </p>

            {/* Generated QR Image */}
            {qrDataUrl && (
              <div className="p-4 bg-white border border-[#E5DDD1] rounded-3xl inline-block shadow-inner">
                <img src={qrDataUrl} alt="Suite Dining QR" className="w-56 h-56 mx-auto" />
              </div>
            )}

            {/* Links and Test Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`/stay?token=${qrModalStay.stay_token}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-[#1E150F] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#29231F] btn-smooth-press"
              >
                <ExternalLink className="w-4 h-4 text-[#B88223]" /> Open Guest View in New Tab
              </a>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/stay?token=${qrModalStay.stay_token}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2.5 px-4 bg-[#FAF8F5] border border-[#E5DDD1] text-[#1E150F] rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-[#EAE2D5] btn-smooth-press"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Link Copied!" : "Copy Guest URL"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
