import React, { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, LoaderCircle, Printer, QrCode, RefreshCw, Sparkles } from "lucide-react";
import { listRooms } from "./propertyApi";
import type { Room } from "./propertyTypes";
import { cn } from "../ui/utils";
import { usePropertyName } from "./useProperty";

type RoomCode = { room: Room; dataUrl: string };

export function AdminRoomQR() {
  const propertyName = usePropertyName();
  const [codes, setCodes] = useState<RoomCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { rooms } = await listRooms();
      const activeRooms = rooms.filter((room) => room.is_active);
      const generated = await Promise.all(
        activeRooms.map(async (room) => {
          const url = new URL("/stay", window.location.origin);
          url.searchParams.set("roomQr", room.qr_token);
          const dataUrl = await QRCode.toDataURL(url.toString(), {
            width: 480,
            margin: 3,
            errorCorrectionLevel: "H",
            color: { dark: "#1E150F", light: "#FFFFFF" },
          });
          return { room, dataUrl };
        })
      );
      setCodes(generated);
    } catch (err: any) {
      setError(err?.message || "Could not load rooms or create room QR codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const downloadCode = (code: RoomCode) => {
    const link = document.createElement("a");
    link.href = code.dataUrl;
    link.download = `suite-${code.room.room_number}-dining-qr.png`;
    link.click();
  };

  return (
    <main className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      <style>{`@media print { body * { visibility: hidden !important; } .room-qr-print, .room-qr-print * { visibility: visible !important; } .room-qr-print { position: absolute; inset: 0; width: 100%; padding: 16mm; } .room-qr-actions { display: none !important; } .room-qr-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12mm; } .room-qr-card { break-inside: avoid; border: 1px solid #ECD7A9 !important; box-shadow: none !important; } }`}</style>

      {/* Header matching Cafe Command Center */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DDD1] room-qr-actions">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Physical Signage & Touchpoints
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            Suite Room QR Placards
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Permanent table stands and bedside decals. Scans dynamically link to active checked-in suite guests.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void loadCodes()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] text-xs font-semibold text-[#1E150F] hover:bg-[#FAF8F5] btn-smooth-press disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => window.print()}
            disabled={!codes.length}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E150F] text-white text-xs font-bold shadow-md btn-smooth-press disabled:opacity-50"
          >
            <Printer className="h-4 w-4 text-[#B88223]" />
            <span>Print All Placards</span>
          </button>
        </div>
      </header>

      <section className="room-qr-print space-y-6">
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 room-qr-actions shadow-2xs">
          <strong>Suite Security Notice:</strong> These permanent QR codes route to the current active stay. If a room is vacant, guests are courteously directed to Reception to check in before ordering is activated.
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2.5 py-20 text-[#73685C] text-xs">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#B88223]" />
            <span>Generating luxury room QR placards…</span>
          </div>
        ) : !codes.length ? (
          <div className="rounded-3xl border border-dashed border-[#D9CDBD] bg-[#FFFDF9] px-6 py-16 text-center">
            <QrCode className="mx-auto h-10 w-10 text-[#B88223]" />
            <h2 className="mt-4 font-serif text-xl font-bold text-[#1E150F]">No Active Rooms Configured</h2>
            <p className="mt-2 text-xs text-[#73685C]">
              Configure suites in Admin → Stays, then generate their permanent QR stands here.
            </p>
          </div>
        ) : (
          <div className="room-qr-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {codes.map(({ room, dataUrl }) => (
              <article
                key={room.id}
                className="room-qr-card rounded-3xl border border-[#E5DDD1] bg-[#FFFDF9] p-6 shadow-xs text-center card-smooth-press"
              >
                <div className="w-8 h-8 rounded-full bg-[#1E150F] text-[#B88223] flex items-center justify-center font-serif text-sm font-bold mx-auto mb-2 border border-[#ECD7A9]">
                  A
                </div>
                <p className="text-xs font-medium text-[#966F29]">{propertyName || "Property"}</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[#141210] tabular-nums">Suite {room.room_number}</h2>
                <p className="text-xs text-[#5C554E]">{room.wing || "Deluxe Suite"}</p>

                <div className="my-4 inline-block rounded-lg border border-[rgba(20,18,16,0.1)] bg-white p-3">
                  <img
                    className="mx-auto h-48 w-48"
                    src={dataUrl}
                    alt={`In-room dining QR code for suite ${room.room_number}`}
                  />
                </div>

                <p className="text-xs text-[#5C554E]">
                  Scan with smartphone camera to open suite services
                </p>

                <button
                  onClick={() => downloadCode({ room, dataUrl })}
                  className="room-qr-actions mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#141210] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#2B2622] btn-smooth-press-sm"
                >
                  <Download className="h-3.5 w-3.5 text-[#D9C7A3]" strokeWidth={1.5} />
                  <span>Download Placard (PNG)</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminRoomQR;
