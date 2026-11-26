import React, { useMemo, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { SilverClocheTrayIcon } from "../../../../core/ui/CustomResortIcons";
import { setupScrollBatchCards, useGSAP } from "../../../../core/ui/gsap";
import { StatusBadge } from "../../../../core/ui/StatusBadge";
import { cn } from "../../../../core/ui/utils";
import { useIrdAdapter } from "../../adapter";
import type { IrdPropertyConfig, Order } from "../../types";

const ORDER_STAGES = [
  { key: "pending", label: "Received", desc: "Awaiting front desk confirmation" },
  { key: "accepted", label: "Confirmed", desc: "Sent to culinary team" },
  { key: "preparing", label: "In Kitchen", desc: "Crafting in resort kitchen" },
  { key: "ready", label: "Plated & Ready", desc: "Ready at culinary pass" },
  { key: "out_for_delivery", label: "En Route", desc: "Butler en route to your suite" },
  { key: "delivered", label: "Delivered", desc: "Delivered to your room" },
];

interface IrdOrdersTrackerProps {
  roomNumber?: string;
  orders: Order[];
  property?: IrdPropertyConfig | null;
  cancellingOrderId: number | null;
  onRefresh: () => void;
  onCancelOrder: (orderId: number) => void;
  onExploreMenu: () => void;
}

export function IrdOrdersTracker({
  roomNumber,
  orders,
  property,
  cancellingOrderId,
  onRefresh,
  onCancelOrder,
  onExploreMenu,
}: IrdOrdersTrackerProps) {
  const { formatPrice } = useIrdAdapter();
  const trackerRef = useRef<HTMLDivElement>(null);
  const taxEnabled = Number(property?.taxRatePercent || 0) > 0;
  const serviceChargeEnabled = Number(property?.serviceChargePercent || 0) > 0;

  const { activeOrders, pastOrders, billableOrdersTotal } = useMemo(() => {
    const active = orders.filter((o) =>
      ["pending", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.status)
    );
    const past = orders.filter((o) => ["delivered", "cancelled", "rejected"].includes(o.status));
    const total = orders
      .filter((order) => !["cancelled", "rejected"].includes(order.status))
      .reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
    return { activeOrders: active, pastOrders: past, billableOrdersTotal: total };
  }, [orders]);

  useGSAP(
    () => {
      const el = trackerRef.current;
      if (!el) return;
      setupScrollBatchCards(el, ".gsap-order-card", { stagger: 0.04, y: 12, start: "top 95%" });
    },
    { scope: trackerRef, dependencies: [orders.length] }
  );

  return (
    <div ref={trackerRef} className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#E7DACB]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B5F54] tabular-nums">
            Suite {roomNumber}
          </span>
          <h2 className="font-sans text-xl font-bold text-[#3D1C11]">Order History & Status</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-semibold text-[#3D1C11] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E5D7C6] bg-[#FFFBF6] hover:bg-[#F3E7DA] btn-smooth-press cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-[#C44D27]" />
          <span>Refresh</span>
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="gsap-order-card p-8 border border-[#EAE0D4] bg-[#FFFBF6] rounded-[26px] text-center shadow-[0_10px_28px_-14px_rgba(64,28,12,0.12)]">
          <div className="w-12 h-12 rounded-full bg-[#FAF3EA] border border-[#EAE0D4] text-[#C44D27] flex items-center justify-center mx-auto mb-3">
            <SilverClocheTrayIcon className="w-6 h-6" />
          </div>
          <h3 className="font-sans text-base font-bold text-[#3D1C11]">No Active Orders</h3>
          <p className="text-xs text-[#7B5F54] mt-1 mb-4">
            You have no pending culinary tickets in preparation.
          </p>
          <button
            type="button"
            onClick={onExploreMenu}
            className="px-6 py-2.5 bg-[#C44D27] hover:bg-[#B2411D] text-white text-xs font-bold rounded-full btn-smooth-press cursor-pointer"
          >
            Explore In-Room Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B5F54] block tabular-nums px-1">
            Active in Kitchen ({activeOrders.length})
          </span>

          {activeOrders.map((ord) => {
            const currentStageIdx = ORDER_STAGES.findIndex((s) => s.key === ord.status);
            const isPending = ord.status === "pending";

            return (
              <div
                key={ord.id}
                className="gsap-order-card border border-[#EAE0D4] bg-[#FFFBF6] rounded-[26px] p-5 space-y-4 shadow-[0_10px_28px_-14px_rgba(64,28,12,0.12)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#3D1C11]">
                      {ord.order_number}
                    </span>
                    <span className="block text-[11px] text-[#7B5F54] mt-0.5">
                      Placed{" "}
                      {new Date(ord.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <StatusBadge status={ord.status} />
                </div>

                <div className="py-2">
                  <div className="relative flex items-center justify-between">
                    <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-[#E7DACB] -z-0 overflow-hidden">
                      <div
                        className="h-full w-full origin-left bg-[#C44D27] transition-transform duration-500 ease-out"
                        style={{
                          transform: `scaleX(${Math.max(0, currentStageIdx) / (ORDER_STAGES.length - 1)})`,
                        }}
                      />
                    </div>

                    {ORDER_STAGES.map((stg, i) => {
                      const isDone = currentStageIdx > i;
                      const isCurr = currentStageIdx === i;

                      return (
                        <div key={stg.key} className="flex flex-col items-center relative z-10">
                          <div className="relative flex items-center justify-center">
                            {isCurr && (
                              <span
                                className="absolute inset-0 rounded-full bg-[#C44D27]/35 zomato-beacon-ring"
                                aria-hidden="true"
                              />
                            )}
                            <div
                              className={cn(
                                "relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors duration-200",
                                isDone || isCurr
                                  ? "bg-[#C44D27] text-white"
                                  : "bg-[#FAF3EA] border border-[#E5D7C6] text-[#7B5F54]"
                              )}
                            >
                              {isDone ? "✓" : i + 1}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-semibold mt-1 text-center max-w-[50px] truncate",
                              isCurr ? "text-[#3D1C11]" : "text-[#7B5F54]"
                            )}
                          >
                            {stg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF3EA] border border-[#EAE0D4] text-xs text-[#3D1C11] flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#C44D27] animate-ping shrink-0" />
                  <span className="font-medium text-[11px]">
                    {ORDER_STAGES[currentStageIdx]?.desc || "Preparing your culinary order."}
                  </span>
                </div>

                <div className="divide-y divide-[#EDE1D3] text-xs">
                  {ord.items?.map((it: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#3D1C11]">
                            {it.quantity}× {it.itemName}
                          </span>
                          {it.variantName && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF3EA] border border-[#EAE0D4] text-[#5B4137]">
                              {it.variantName}
                            </span>
                          )}
                        </div>
                        {it.selectedModifiers && it.selectedModifiers.length > 0 && (
                          <p className="text-[10px] text-[#7B5F54]">
                            {it.selectedModifiers.map((m: any) => m.name).join(", ")}
                          </p>
                        )}
                        {it.notes && (
                          <p className="text-[10px] text-[#5B4137] italic">Note: {it.notes}</p>
                        )}
                      </div>
                      <span className="font-sans text-[12px] font-extrabold text-[#3D1C11] tabular-nums">
                        {formatPrice(it.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {ord.special_instructions && (
                  <div className="text-[11px] text-[#5B4137] bg-[#FAF3EA] border border-[#EAE0D4] p-3 rounded-2xl">
                    <span className="font-bold text-[#3D1C11]">Delivery Note: </span>
                    {ord.special_instructions}
                  </div>
                )}

                {(taxEnabled || serviceChargeEnabled) && (
                  <div className="rounded-2xl bg-[#FAF3EA] border border-[#EAE0D4] px-3 py-2 text-[10px] text-[#7B5F54] space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(ord.subtotal)}</span>
                    </div>
                    {taxEnabled && (
                      <div className="flex justify-between">
                        <span>GST / Tax ({property?.taxRatePercent}%)</span>
                        <span>{formatPrice(ord.tax_amount)}</span>
                      </div>
                    )}
                    {serviceChargeEnabled && (
                      <div className="flex justify-between">
                        <span>In-Room Service Charge ({property?.serviceChargePercent}%)</span>
                        <span>{formatPrice(ord.service_charge)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-[#EDE1D3] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#7B5F54] block">Folio Charge</span>
                    <span className="font-sans text-[15px] font-extrabold text-[#3D1C11] tabular-nums">
                      {formatPrice(ord.total_amount)}
                    </span>
                  </div>

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => onCancelOrder(ord.id)}
                      disabled={cancellingOrderId === ord.id}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-full border border-rose-200 btn-smooth-press cursor-pointer"
                    >
                      {cancellingOrderId === ord.id ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pastOrders.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#E7DACB]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B5F54] block px-1">
            Delivered & Completed ({pastOrders.length})
          </span>

          <div className="space-y-3">
            {pastOrders.map((ord) => (
              <div
                key={ord.id}
                className="gsap-order-card p-4 border border-[#EAE0D4] bg-[#FFFBF6] rounded-[24px] text-xs space-y-2 shadow-[0_8px_20px_-14px_rgba(64,28,12,0.1)]"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono font-semibold text-[#3D1C11]">
                    {ord.order_number}
                  </span>
                  <StatusBadge status={ord.status} />
                </div>

                <p className="text-[11px] text-[#5B4137]">
                  {ord.items
                    ?.map(
                      (it: any) =>
                        `${it.quantity}× ${it.itemName}${it.variantName ? ` (${it.variantName})` : ""}`
                    )
                    .join(", ")}
                </p>

                {(taxEnabled || serviceChargeEnabled) && (
                  <div className="rounded-xl bg-[#FAF3EA] border border-[#EAE0D4] px-3 py-2 text-[10px] text-[#7B5F54] space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(ord.subtotal)}</span>
                    </div>
                    {taxEnabled && (
                      <div className="flex justify-between">
                        <span>GST / Tax ({property?.taxRatePercent}%)</span>
                        <span>{formatPrice(ord.tax_amount)}</span>
                      </div>
                    )}
                    {serviceChargeEnabled && (
                      <div className="flex justify-between">
                        <span>In-Room Service Charge ({property?.serviceChargePercent}%)</span>
                        <span>{formatPrice(ord.service_charge)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-[#EDE1D3] text-[11px]">
                  <span className="text-[#7B5F54]">
                    {new Date(ord.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-sans text-[14px] font-extrabold text-[#3D1C11] tabular-nums">
                    {formatPrice(ord.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="gsap-order-card flex items-center justify-between rounded-[24px] border border-[#EAE0D4] bg-[#FFFBF6] px-5 py-3.5 shadow-[0_8px_20px_-14px_rgba(64,28,12,0.1)]">
          <span className="text-sm font-semibold text-[#5B4137]">Total for this stay</span>
          <span className="font-sans text-[15px] font-extrabold text-[#3D1C11] tabular-nums">
            {formatPrice(billableOrdersTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
