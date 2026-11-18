import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { listAdminOrders, updateOrderStatus, Order } from "../lib/api";
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
} from "lucide-react";

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

    const unsubCreated = onOrderCreated((newOrder) => {
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

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DDD1]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#B88223]">
            Reception & Butler Station
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F]">
            In-Room Dining Order Queue
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Realtime culinary ticket dispatch, fulfillment coordination, and delivery tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/stays"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#E5DDD1] text-[#1E150F] hover:bg-[#F8F5EF] transition-colors"
          >
            Stays & Rooms
          </Link>
          <Link
            href="/kitchen"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#B88223] text-white hover:bg-[#9E6E1A] transition-colors shadow-xs"
          >
            Open Kitchen KOT Display
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "all", label: "All Orders" },
            { id: "pending", label: "⚡ Pending Reception" },
            { id: "accepted", label: "Accepted" },
            { id: "preparing", label: "In Kitchen" },
            { id: "ready", label: "Ready to Dispatch" },
            { id: "out_for_delivery", label: "En Route" },
            { id: "delivered", label: "Delivered" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#1E150F] text-white shadow-xs"
                  : "bg-[#FFFDF9] text-[#73685C] border border-[#E5DDD1] hover:border-[#B88223]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Room Search */}
        <div className="relative max-w-xs">
          <Search className="w-4 h-4 text-[#73685C] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by Room #..."
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FFFDF9] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
          />
        </div>
      </div>

      {/* Orders Grid / Queue */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-[#B88223] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs text-[#73685C]">Loading live orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-16 text-center max-w-lg mx-auto">
          <span className="text-4xl block mb-3">🛎️</span>
          <h3 className="font-serif text-lg font-bold text-[#1E150F] mb-1">Queue is Clear</h3>
          <p className="text-xs text-[#73685C]">
            No in-room dining orders matching the current filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`bg-[#FFFDF9] border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                order.status === "pending"
                  ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20"
                  : "border-[#E5DDD1]"
              }`}
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
                <div className="py-3 border-y border-[#E5DDD1]/60 space-y-1.5 my-3 text-xs">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-[#1E150F] font-medium truncate pr-2">
                        <span className="font-bold text-[#B88223]">{item.quantity}×</span> {item.itemName}
                      </span>
                      <span className="font-mono text-[11px] text-[#73685C] shrink-0">
                        ${Number(item.lineTotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                {order.special_instructions && (
                  <div className="p-2.5 bg-[#F8F5EF] rounded-xl text-[11px] text-[#825C15] mb-3">
                    <span className="font-bold">Guest Note: </span>
                    {order.special_instructions}
                  </div>
                )}

                {/* Timestamps & Folio Total */}
                <div className="flex items-center justify-between text-xs pt-1 mb-4">
                  <span className="text-[#73685C] flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-mono font-bold text-[#1E150F] text-sm">
                    ${Number(order.total_amount).toFixed(2)}
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
                      className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept Order
                    </button>
                    <button
                      onClick={() => setRejectModalOrder(order)}
                      disabled={isUpdating}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Decline
                    </button>
                  </>
                )}

                {order.status === "ready" && (
                  <button
                    onClick={() => handleStatusTransition(order.id, "out_for_delivery")}
                    disabled={isUpdating}
                    className="w-full py-2 px-3 bg-[#1E150F] hover:bg-[#29231F] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Truck className="w-4 h-4 text-[#B88223]" /> Dispatch to Suite {order.room_number}
                  </button>
                )}

                {order.status === "out_for_delivery" && (
                  <button
                    onClick={() => handleStatusTransition(order.id, "delivered")}
                    disabled={isUpdating}
                    className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Delivered to Room
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="py-2 px-3 bg-[#F8F5EF] hover:bg-[#EAE2D5] text-[#1E150F] rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ml-auto"
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
      >
        <div className="space-y-4">
          <p className="text-xs text-[#73685C]">
            Please specify the reason for declining Order{" "}
            <span className="font-bold text-[#1E150F]">{rejectModalOrder?.order_number}</span> from{" "}
            <span className="font-bold text-[#1E150F]">Suite {rejectModalOrder?.room_number}</span>.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Reason Provided to Guest
            </label>
            <input
              type="text"
              placeholder="e.g. Kitchen closed for deep sanitation / specific ingredient 86'd"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setRejectModalOrder(null)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#73685C] hover:bg-[#F8F5EF]"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                rejectModalOrder && handleStatusTransition(rejectModalOrder.id, "rejected", rejectionReason)
              }
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs"
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
        title={selectedOrder ? `Order Audit · ${selectedOrder.order_number}` : ""}
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            <div className="flex justify-between items-start p-4 bg-[#F8F5EF] rounded-2xl">
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
                      <span className="font-bold text-[#1E150F]">
                        {item.quantity}× {item.itemName}
                      </span>
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <p className="text-[11px] text-[#73685C]">
                          {item.selectedModifiers.map((m: any) => `${m.name} (+$${m.priceDelta})`).join(", ")}
                        </p>
                      )}
                      {item.notes && <p className="text-[#825C15] italic">Note: {item.notes}</p>}
                    </div>
                    <span className="font-mono font-bold">${Number(item.lineTotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="p-3.5 bg-[#F8F5EF] rounded-xl space-y-1.5">
              <div className="flex justify-between text-[#73685C]">
                <span>Subtotal</span>
                <span className="font-mono">${Number(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#73685C]">
                <span>Tax</span>
                <span className="font-mono">${Number(selectedOrder.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#73685C]">
                <span>Service Charge</span>
                <span className="font-mono">${Number(selectedOrder.service_charge).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#1E150F] pt-1.5 border-t border-[#E5DDD1]">
                <span>Folio Total</span>
                <span className="font-mono">${Number(selectedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-1 text-[#73685C] text-[11px]">
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
