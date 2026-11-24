import React, { useState, useEffect, useCallback } from "react";
import { irdApi } from "../api";
const { getKitchenTickets, advanceKitchenTicket } = irdApi;
import { irdRealtime } from "../realtime";
const { joinKitchenRoom, onOrderCreated, onOrderStatusChanged } = irdRealtime;
import { playOrderChime, setSoundEnabled, isSoundEnabled } from "../../../core/ui/audio";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Flame,
  Utensils,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "../../../core/ui/utils";
import { usePropertyName } from "../../../core/property/useProperty";

interface Ticket {
  id: number;
  order_number: string;
  room_number: string;
  guest_name: string;
  status: "accepted" | "preparing" | "ready";
  special_instructions: string | null;
  created_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  items: Array<{
    id: number;
    itemName: string;
    variantName?: string | null;
    quantity: number;
    selectedModifiers: any[];
    notes?: string;
  }>;
}

export function KitchenKOT() {
  const propertyName = usePropertyName();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await getKitchenTickets();
      setTickets(res.tickets);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    const staffToken = localStorage.getItem("ird_staff_token");
    joinKitchenRoom(staffToken || undefined);

    const unsubCreated = onOrderCreated(() => {
      playOrderChime();
      fetchTickets();
    });

    const unsubStatus = onOrderStatusChanged(() => {
      fetchTickets();
    });

    // Update ticker every second for elapsed timers
    const timerInterval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    // Refresh tickets every 10 seconds
    const pollInterval = setInterval(fetchTickets, 10000);

    return () => {
      unsubCreated();
      unsubStatus();
      clearInterval(timerInterval);
      clearInterval(pollInterval);
    };
  }, [fetchTickets]);

  const handleAdvance = async (ticketId: number) => {
    setUpdatingId(ticketId);
    try {
      await advanceKitchenTicket(ticketId);
      await fetchTickets();
    } catch (err: any) {
      alert("Error advancing ticket: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playOrderChime();
  };

  const getElapsedMinutes = (createdAt: string) => {
    const diffMs = now - new Date(createdAt).getTime();
    return Math.floor(diffMs / 60000);
  };

  const getElapsedFormatted = (createdAt: string) => {
    const totalSecs = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div className="min-h-[100dvh] bg-[#1E150F] text-[#FFFDF9] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Kitchen Header matching Cafe Bar/Kitchen display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#3D3025]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#292019] text-[#B88223] flex items-center justify-center border border-[#B88223]/30 shadow-md">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Kitchen KOT Display
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#B88223]/20 text-[#D5A754] border border-[#B88223]/40">
                  {tickets.length} Active Tickets
                </span>
              </div>
              <p className="text-xs text-[#A89886] mt-0.5">
                {propertyName ? `${propertyName} · ` : ""}Tablet-optimized live order ticket system
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleSound}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-[transform,background-color,border-color,color,box-shadow] duration-150 btn-smooth-press cursor-pointer",
                soundOn
                  ? "bg-[#B88223] text-white shadow-xs"
                  : "bg-[#292019] text-[#A89886] border border-[#3D3025]"
              )}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundOn ? "Audio Chime ON" : "Chime Muted"}</span>
            </button>

            <button
              onClick={() => void fetchTickets()}
              className="p-2.5 bg-[#292019] hover:bg-[#3D3025] text-white rounded-xl border border-[#3D3025] transition-colors btn-smooth-press cursor-pointer"
              title="Refresh tickets"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-[#B88223] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <span className="text-sm text-[#A89886]">Connecting to Kitchen Order Tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-[#292019] border border-[#3D3025] rounded-xl p-14 text-center max-w-lg mx-auto shadow-xl">
            <ChefHat className="w-8 h-8 text-[#D9C7A3] mx-auto mb-3" strokeWidth={1.4} />
            <h3 className="font-serif text-2xl font-semibold text-white mb-1.5">All Culinary Tickets Clear</h3>
            <p className="text-xs text-[#A89886] leading-relaxed">
              No active in-room dining tickets currently require preparation. New orders chime automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => {
              const elapsedMins = getElapsedMinutes(ticket.created_at);
              const isUrgent = elapsedMins >= 25;
              const isWarning = elapsedMins >= 15 && elapsedMins < 25;

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    "bg-[#292019] border-2 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-[transform,border-color,box-shadow] duration-200",
                    isUrgent
                      ? "border-red-500/80 ring-2 ring-red-500/30 shadow-red-950/20"
                      : isWarning
                      ? "border-amber-500/70 shadow-amber-950/20"
                      : "border-[#3D3025]"
                  )}
                >
                  <div>
                    {/* Header: Suite # & Elapsed Timer */}
                    <div className="flex items-start justify-between gap-2 pb-4 border-b border-[#3D3025]">
                      <div>
                        <span className="font-serif text-3xl font-extrabold text-white block tracking-tight">
                          SUITE {ticket.room_number}
                        </span>
                        <span className="text-xs text-[#A89886]">{ticket.guest_name}</span>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold shadow-2xs",
                            isUrgent
                              ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                              : isWarning
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-[#1E150F] text-[#D5A754] border border-[#B88223]/30"
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{getElapsedFormatted(ticket.created_at)}</span>
                        </div>
                        <span className="block font-mono text-[10px] text-[#A89886] mt-1">
                          {ticket.order_number}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="my-3">
                      {ticket.status === "accepted" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                          NEW TICKET · AWAITING PREP
                        </span>
                      )}
                      {ticket.status === "preparing" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          <Flame className="w-3.5 h-3.5" />
                          IN PREPARATION
                        </span>
                      )}
                      {ticket.status === "ready" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PLATED · WAITING BUTLER DISPATCH
                        </span>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-2.5 my-4">
                      {ticket.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-[#1E150F] rounded-2xl border border-[#3D3025] shadow-2xs"
                        >
                          <div className="flex items-baseline gap-2.5 flex-wrap">
                            <span className="font-mono text-lg font-black text-[#B88223]">
                              {item.quantity}×
                            </span>
                            <span className="font-serif text-base font-bold text-white">
                              {item.itemName}
                            </span>
                            {item.variantName && (
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#B88223]/25 text-[#ECD7A9] border border-[#B88223]/40">
                                {item.variantName}
                              </span>
                            )}
                          </div>

                          {/* Modifiers */}
                          {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                            <div className="mt-1 pl-7 text-xs text-[#D5A754] font-medium">
                              {item.selectedModifiers.map((m: any) => m.name).join(" · ")}
                            </div>
                          )}

                          {/* Special notes */}
                          {item.notes && (
                            <div className="mt-1 pl-7 text-xs text-amber-300 italic">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Delivery Instructions */}
                    {ticket.special_instructions && (
                      <div className="p-3.5 bg-[#1E150F]/80 border border-[#B88223]/30 rounded-2xl text-xs text-[#D5A754] mb-4">
                        <span className="font-bold text-white uppercase tracking-wider block text-[10px] mb-0.5">
                          Suite Delivery Instructions:
                        </span>
                        "{ticket.special_instructions}"
                      </div>
                    )}
                  </div>

                  {/* Big Touch Action Button */}
                  <div className="pt-4 border-t border-[#3D3025]">
                    {ticket.status === "accepted" && (
                      <button
                        onClick={() => handleAdvance(ticket.id)}
                        disabled={updatingId === ticket.id}
                        className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-[#B88223] hover:bg-[#A3731E] transition-[transform,background-color,box-shadow] duration-150 shadow-lg flex items-center justify-center gap-2 cursor-pointer btn-smooth-press active:scale-98 disabled:opacity-50"
                      >
                        <Flame className="w-5 h-5" />
                        <span>{updatingId === ticket.id ? "Updating..." : "START PREPARING"}</span>
                      </button>
                    )}

                    {ticket.status === "preparing" && (
                      <button
                        onClick={() => handleAdvance(ticket.id)}
                        disabled={updatingId === ticket.id}
                        className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 transition-[transform,background-color,box-shadow] duration-150 shadow-lg flex items-center justify-center gap-2 cursor-pointer btn-smooth-press active:scale-98 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{updatingId === ticket.id ? "Updating..." : "MARK READY FOR PLATING"}</span>
                      </button>
                    )}

                    {ticket.status === "ready" && (
                      <div className="py-3.5 px-4 rounded-2xl bg-[#1E150F] border border-emerald-500/40 text-center text-xs font-semibold text-emerald-400">
                        ✓ Ready at Pass · Butler Dispatched
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
