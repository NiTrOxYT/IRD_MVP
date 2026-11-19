import React, { useState, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { getOrder, cancelGuestOrder, Order } from "../lib/api";
import { formatINR } from "../lib/currency";
import { joinOrderRoom, onOrderStatusChanged, subscribeConnectionStatus } from "../lib/socket";
import { StatusBadge } from "../components/StatusBadge";
import { playOrderChime } from "../lib/audio";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  Radio,
  Receipt,
  Utensils,
  BellRing,
} from "lucide-react";
import { cn } from "../lib/utils";

const STAGES = [
  { key: "pending", label: "Received", desc: "Awaiting front desk review" },
  { key: "accepted", label: "Confirmed", desc: "Sent to kitchen station" },
  { key: "preparing", label: "In Kitchen", desc: "Being prepared by resort chefs" },
  { key: "ready", label: "Plated & Ready", desc: "Awaiting butler dispatch" },
  { key: "out_for_delivery", label: "En Route", desc: "On its way to your suite" },
  { key: "delivered", label: "Delivered", desc: "Enjoy your culinary dining" },
];

export function GuestOrderTracking() {
  const [, params] = useRoute("/order/:id");
  const [, setLocation] = useLocation();
  const orderId = Number(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [connStatus, setConnStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");

  const fetchLatestOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await getOrder(orderId);
      setOrder(res.order);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to load order");
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchLatestOrder();

    if (orderId) {
      joinOrderRoom(orderId);
    }

    const unsubStatus = onOrderStatusChanged(({ order: updatedOrder }) => {
      if (updatedOrder.id === orderId) {
        setOrder(updatedOrder);
        playOrderChime();
      }
    });

    const unsubConn = subscribeConnectionStatus(setConnStatus);

    const interval = setInterval(() => {
      fetchLatestOrder();
    }, 5000);

    return () => {
      unsubStatus();
      unsubConn();
      clearInterval(interval);
    };
  }, [orderId, fetchLatestOrder]);

  const handleCancelOrder = async () => {
    if (!order || order.status !== "pending") return;
    if (!window.confirm("Are you sure you wish to cancel this in-room dining request?")) return;

    setIsCancelling(true);
    try {
      const res = await cancelGuestOrder(order.id);
      setOrder(res.order);
    } catch (err: any) {
      alert("Could not cancel order: " + err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#B88223] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-serif text-sm text-[#73685C]">Connecting to suite order feed...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-[#FFFDF9] border border-red-200 rounded-3xl text-center shadow-lg">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="font-serif text-xl font-bold text-[#1E150F] mb-2">Order Not Found</h2>
        <p className="text-xs text-[#73685C] mb-6">{error || "Unable to locate this order."}</p>
        <Link
          href="/stay/menu"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-xs text-white bg-[#1E150F] btn-smooth-press"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  const isTerminal = order.status === "delivered" || order.status === "cancelled" || order.status === "rejected";
  const currentStageIndex = STAGES.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/stay/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73685C] hover:text-[#1E150F] transition-colors btn-smooth-press"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to In-Room Menu</span>
          </Link>

          {/* Reconnecting pill */}
          {connStatus === "reconnecting" && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Live socket reconnecting (Polling backup active)
            </div>
          )}
        </div>

        {/* Order Header Card */}
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-[#B88223] uppercase tracking-wider">
                  {order.order_number}
                </span>
                <span className="text-xs text-[#73685C]">·</span>
                <span className="text-xs font-semibold text-[#1E150F]">
                  Suite {order.room_number}
                </span>
              </div>
              <h1 className="font-serif text-2xl font-bold text-[#1E150F]">
                Order Status Tracking
              </h1>
              <p className="text-xs text-[#73685C] mt-0.5">
                Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div>
              <StatusBadge status={order.status} />
            </div>
          </div>

          {/* Stepper (for normal progressive orders) */}
          {order.status !== "rejected" && order.status !== "cancelled" ? (
            <div className="py-6 border-y border-[#E5DDD1]/70">
              <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-[#EAE2D5] -z-0">
                  <div
                    className="h-full bg-[#B88223] transition-all duration-500"
                    style={{
                      width: `${(Math.max(0, currentStageIndex) / (STAGES.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {STAGES.map((stage, idx) => {
                  const isDone = currentStageIndex > idx;
                  const isCurrent = currentStageIndex === idx;

                  return (
                    <div key={stage.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs",
                          isDone
                            ? "bg-[#B88223] text-white"
                            : isCurrent
                            ? "bg-[#1E150F] text-[#B88223] ring-4 ring-[#B88223]/20"
                            : "bg-[#FAF8F5] text-[#73685C] border border-[#E5DDD1]"
                        )}
                      >
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-semibold mt-2 text-center max-w-[60px] truncate",
                          isCurrent ? "text-[#1E150F]" : "text-[#73685C]"
                        )}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Current Stage Highlight Box */}
              <div className="mt-6 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E150F] text-[#B88223] flex items-center justify-center shrink-0 shadow-2xs">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#1E150F]">
                    {STAGES[currentStageIndex]?.label || "Order Placed"}
                  </h4>
                  <p className="text-xs text-[#73685C]">
                    {STAGES[currentStageIndex]?.desc || "Your culinary order is in our system."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Cancelled or Rejected Banner */
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 my-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <h4 className="font-serif font-bold text-sm">
                    {order.status === "rejected" ? "Order Declined by Reception" : "Order Cancelled"}
                  </h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    {order.rejection_reason ||
                      "This order is no longer being fulfilled. You will not be charged."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ordered Items Summary */}
          <div className="mt-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-[#1E150F]">
              Ordered Items
            </h3>
            <div className="divide-y divide-[#E5DDD1]/70">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-3 flex items-baseline justify-between">
                  <div className="pr-4">
                    <span className="font-medium text-xs text-[#1E150F]">
                      <span className="font-bold text-[#B88223]">{item.quantity}×</span> {item.itemName}
                      {item.variantName && (
                        <span className="ml-1 text-[10px] font-bold text-[#8E6314]">({item.variantName})</span>
                      )}
                    </span>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <p className="text-[11px] text-[#73685C]">
                        {item.selectedModifiers.map((m: any) => m.name).join(", ")}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-[#825C15] italic">Note: {item.notes}</p>
                    )}
                  </div>
                  <span className="font-serif text-xs font-bold text-[#1E150F] shrink-0">
                    {formatINR(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            {order.special_instructions && (
              <div className="p-3.5 bg-[#FAF8F5] rounded-xl text-xs text-[#73685C] border border-[#E5DDD1]/60">
                <span className="font-semibold text-[#1E150F]">Delivery Note: </span>
                {order.special_instructions}
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-[#E5DDD1] flex justify-between items-baseline font-bold text-sm text-[#1E150F]">
              <span className="font-serif">Room Folio Total</span>
              <span className="font-serif text-lg font-bold">{formatINR(order.total_amount)}</span>
            </div>
          </div>

          {/* Cancel Action if Pending */}
          {order.status === "pending" && (
            <div className="mt-8 pt-6 border-t border-[#E5DDD1] flex justify-end">
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors btn-smooth-press cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
