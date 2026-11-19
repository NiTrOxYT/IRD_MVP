import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { listAdminOrders, updateOrderStatus, Order } from "../lib/api";
import { formatINR } from "../lib/currency";
import { joinAdminRoom, onOrderCreated, onOrderStatusChanged } from "../lib/socket";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { playOrderChime } from "../lib/audio";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  Eye,
  UtensilsCrossed,
  Receipt,
  RotateCcw,
  Sparkles,
  ChefHat,
  DoorOpen,
} from "lucide-react";
import { cn } from "../lib/utils";

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roomFilter, setRoomFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await listAdminOrders({
        status: statusFilter !== "all" ? statusFilter : undefined,
        room: roomFilter.trim() || undefined,
      });
      setOrders(res.orders);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [statusFilter, roomFilter]);

  useEffect(() => {
    fetchOrders();

    const staffToken = localStorage.getItem("ird_staff_token");
    joinAdminRoom(staffToken || undefined);

    const unsubCreated = onOrderCreated(() => {
      playOrderChime();
      fetchOrders();
    });

    const unsubStatus = onOrderStatusChanged(() => {
      fetchOrders();
    });

    const interval = setInterval(fetchOrders, 6000);

    return () => {
      unsubCreated();
      unsubStatus();
      clearInterval(interval);
    };
  }, [fetchOrders]);

  const handleStatusTransition = async (orderId: number, nextStatus: string, reason?: string) => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(orderId, nextStatus, reason);
      if (rejectModalOrder) {
        setRejectModalOrder(null);
        setRejectionReason("");
      }
      await fetchOrders();
    } catch (err: any) {
      alert("Status change failed: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header matching Cafe Command Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DDD1]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Command Center · Butler & Reception
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            In-Room Dining Order Queue
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Realtime ticket reception, kitchen progress coordination, and suite butler delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void fetchOrders()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#E5DDD1] text-[#1E150F] hover:bg-[#FAF8F5] shadow-2xs btn-smooth-press"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <Link
            href="/kitchen"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1E150F] text-white hover:bg-[#29231F] shadow-xs btn-smooth-press"
          >
            <ChefHat className="w-3.5 h-3.5 text-[#B88223]" />
            <span>Kitchen KOT Display</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs with Cafe Gold Active Styling */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
          {[
            { id: "all", label: "All Orders", count: orders.length },
            { id: "pending", label: "Pending Reception", count: pendingCount },
            { id: "accepted", label: "Accepted" },
            { id: "preparing", label: "In Kitchen" },
            { id: "ready", label: "Ready to Dispatch" },
            { id: "out_for_delivery", label: "En Route" },
            { id: "delivered", label: "Delivered" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all btn-smooth-press flex items-center gap-1.5 cursor-pointer",
                statusFilter === tab.id
                  ? "bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9] shadow-2xs"
                  : "bg-[#FFFDF9] text-[#73685C] border border-[#E5DDD1] hover:bg-[#FAF8F5]"
              )}
            >
              <span>{tab.label}</span>
              {tab.id === "pending" && pendingCount > 0 && (
                <span className="bg-amber-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Room Search */}
        <div className="relative max-w-xs shrink-0">
          <Search className="w-4 h-4 text-[#73685C] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Suite #..."
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30 shadow-2xs"
          />
        </div>
      </div>

      {/* Orders Grid / Queue */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 rounded-full border-3 border-[#B88223] border-t-transparent animate-spin mx-auto mb-3"></div>
          <span className="text-xs text-[#73685C]">Loading live orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-16 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] text-[#B88223] flex items-center justify-center mx-auto mb-3 border border-[#E5DDD1]">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#1E150F] mb-1">Queue is Clear</h3>
          <p className="text-xs text-[#73685C]">
            No in-room dining orders matching the current filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className={cn(
                "bg-[#FFFDF9] border rounded-3xl p-5 shadow-xs flex flex-col justify-between transition-all card-smooth-press",
                order.status === "pending"
                  ? "border-amber-400/80 ring-2 ring-amber-400/20 bg-amber-50/25"
                  : "border-[#E5DDD1]"
              )}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-lg font-serif font-bold text-[#1E150F] block">
                      Suite {order.room_number}
                    </span>
                    <span className="text-xs text-[#73685C]">{order.guest_name}</span>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <span className="block font-mono text-[10px] text-[#73685C] mt-1">
                      {order.order_number}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="py-3 border-y border-[#E5DDD1]/70 space-y-1.5 my-3 text-xs">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-[#1E150F] font-medium truncate pr-2">
                        <span className="font-bold text-[#B88223]">{item.quantity}×</span> {item.itemName}
                        {item.variantName && (
                          <span className="ml-1 text-[10px] font-bold text-[#8E6314]">({item.variantName})</span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-[#73685C] shrink-0">
                        {formatINR(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                {order.special_instructions && (
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1]/70 text-[11px] text-[#8E6314] mb-3">
                    <span className="font-bold text-[#1E150F]">Guest Note: </span>
                    {order.special_instructions}
                  </div>
                )}

                {/* Timestamps & Folio Total */}
                <div className="flex items-center justify-between text-xs pt-1 mb-4">
                  <span className="text-[#73685C] flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-[#B88223]" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-serif font-bold text-[#1E150F] text-base">
                    {formatINR(order.total_amount)}
                  </span>
                </div>
              </div>

              {/* Action Buttons based on status */}
              <div className="pt-3 border-t border-[#E5DDD1] flex flex-wrap gap-2">
                {order.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleStatusTransition(order.id, "accepted")}
                      disabled={isUpdating}
                      className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 btn-smooth-press shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept Order
                    </button>
                    <button
                      onClick={() => setRejectModalOrder(order)}
                      disabled={isUpdating}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold btn-smooth-press cursor-pointer border border-red-200"
                    >
                      Decline
                    </button>
                  </>
                )}

                {order.status === "ready" && (
                  <button
                    onClick={() => handleStatusTransition(order.id, "out_for_delivery")}
                    disabled={isUpdating}
                    className="w-full py-2 px-3 bg-[#1E150F] hover:bg-[#29231F] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 btn-smooth-press shadow-xs cursor-pointer"
                  >
                    <Truck className="w-4 h-4 text-[#B88223]" /> Dispatch to Suite {order.room_number}
                  </button>
                )}

                {order.status === "out_for_delivery" && (
                  <button
                    onClick={() => handleStatusTransition(order.id, "delivered")}
                    disabled={isUpdating}
                    className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 btn-smooth-press shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Delivered to Room
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="py-2 px-3 bg-[#FAF8F5] hover:bg-[#EAE2D5] text-[#1E150F] rounded-xl text-xs font-medium flex items-center gap-1 btn-smooth-press border border-[#E5DDD1] cursor-pointer ml-auto"
                >
                  <Eye className="w-3.5 h-3.5" /> Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      <Modal
        isOpen={Boolean(rejectModalOrder)}
        onClose={() => setRejectModalOrder(null)}
        title="Decline In-Room Dining Order"
        description="Provide reason to guest folio notification"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#73685C]">
            Please specify the reason for declining Order{" "}
            <span className="font-bold text-[#1E150F]">{rejectModalOrder?.order_number}</span> from{" "}
            <span className="font-bold text-[#1E150F]">Suite {rejectModalOrder?.room_number}</span>.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Reason Provided to Guest
            </label>
            <input
              type="text"
              placeholder="e.g. Kitchen closed for deep sanitation / specific ingredient unavailable"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E5DDD1]">
            <button
              onClick={() => setRejectModalOrder(null)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#73685C] hover:bg-[#FAF8F5] btn-smooth-press"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                rejectModalOrder && handleStatusTransition(rejectModalOrder.id, "rejected", rejectionReason)
              }
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs btn-smooth-press"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order Details · ${selectedOrder.order_number}` : ""}
        description="Full folio audit and dispatch history"
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            <div className="flex justify-between items-start p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1]">
              <div>
                <span className="font-serif text-base font-bold text-[#1E150F] block">
                  Suite {selectedOrder.room_number}
                </span>
                <span className="text-[#73685C]">Guest: {selectedOrder.guest_name}</span>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#1E150F] uppercase tracking-wider text-[11px]">
                Itemized Summary
              </h4>
              <div className="divide-y divide-[#E5DDD1]">
                {selectedOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="py-2.5 flex justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#1E150F]">
                          {item.quantity}× {item.itemName}
                        </span>
                        {item.variantName && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                            {item.variantName}
                          </span>
                        )}
                      </div>
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <p className="text-[11px] text-[#73685C]">
                          {item.selectedModifiers.map((m: any) => `${m.name} (+${formatINR(m.priceDelta)})`).join(", ")}
                        </p>
                      )}
                      {item.notes && <p className="text-[#8E6314] italic">Note: {item.notes}</p>}
                    </div>
                    <span className="font-serif font-bold text-sm">{formatINR(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1] space-y-2">
              <div className="flex justify-between text-[#73685C]">
                <span>Subtotal</span>
                <span className="font-mono">{formatINR(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#73685C]">
                <span>Tax</span>
                <span className="font-mono">{formatINR(selectedOrder.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-[#73685C]">
                <span>Service Charge</span>
                <span className="font-mono">{formatINR(selectedOrder.service_charge)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#1E150F] pt-2 border-t border-[#E5DDD1]">
                <span className="font-serif text-sm">Folio Total</span>
                <span className="font-serif text-base">{formatINR(selectedOrder.total_amount)}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-1.5 text-[#73685C] text-[11px] p-3 bg-[#FAF8F5] rounded-xl border border-[#E5DDD1]/70">
              <div>Placed: {new Date(selectedOrder.created_at).toLocaleString()}</div>
              {selectedOrder.accepted_at && (
                <div>Accepted: {new Date(selectedOrder.accepted_at).toLocaleString()}</div>
              )}
              {selectedOrder.preparing_at && (
                <div>Kitchen Started: {new Date(selectedOrder.preparing_at).toLocaleString()}</div>
              )}
              {selectedOrder.ready_at && (
                <div>Plated Ready: {new Date(selectedOrder.ready_at).toLocaleString()}</div>
              )}
              {selectedOrder.dispatched_at && (
                <div>Dispatched: {new Date(selectedOrder.dispatched_at).toLocaleString()}</div>
              )}
              {selectedOrder.delivered_at && (
                <div>Delivered: {new Date(selectedOrder.delivered_at).toLocaleString()}</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
