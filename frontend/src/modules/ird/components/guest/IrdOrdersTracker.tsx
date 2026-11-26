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
      setupScrollBatchCards(el, ".gsap-order-card", { stagger: 0.08, y: 24, start: "top 94%" });
    },
    { scope: trackerRef, dependencies: [orders.length], revertOnUpdate: true }
  );

  return (
    <div ref={trackerRef} className="mx-auto max-w-md sm:max-w-2xl lg:max-w-4xl space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-white/15">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 tabular-nums">
            Suite {roomNumber}
          </span>
          <h2 className="font-sans text-xl font-bold text-white">Order History & Status</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full frost-pill-chip btn-smooth-press"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="gsap-order-card p-8 frost-component-card rounded-[30px] text-center">
          <div className="w-12 h-12 rounded-full frost-pill-chip text-white flex items-center justify-center mx-auto mb-3">
            <SilverClocheTrayIcon className="w-6 h-6" />
          </div>
          <h3 className="font-sans text-base font-bold text-white">No Active Orders</h3>
          <p className="text-xs text-white/70 mt-1 mb-4">
            You have no pending culinary tickets in preparation.
          </p>
          <button
            type="button"
            onClick={onExploreMenu}
            className="px-6 py-2.5 frost-cta-white text-xs font-bold rounded-full btn-smooth-press"
          >
            Explore In-Room Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/75 block tabular-nums px-1">
            Active in Kitchen ({activeOrders.length})
          </span>

          {activeOrders.map((ord) => {
            const currentStageIdx = ORDER_STAGES.findIndex((s) => s.key === ord.status);
            const isPending = ord.status === "pending";

            return (
              <div
                key={ord.id}
                className="gsap-order-card frost-component-card rounded-[30px] p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-white">
                      {ord.order_number}
                    </span>
                    <span className="block text-[11px] text-white/65 mt-0.5">
                      Placed{" "}
                      {new Date(ord.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <StatusBadge status={ord.status} variant="glass" />
                </div>

                <div className="py-2">
                  <div className="relative flex items-center justify-between">
                    <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-white/15 -z-0 overflow-hidden">
                      <div
                        className="h-full w-full origin-left bg-white transition-transform duration-500 ease-out"
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
                                className="absolute inset-0 rounded-full bg-white/45 zomato-beacon-ring"
                                aria-hidden="true"
                              />
                            )}
                            <div
                              className={cn(
                                "relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors duration-200",
                                isDone || isCurr ? "frost-cta-white" : "frost-pill-chip text-white/70"
                              )}
                            >
                              {isDone ? "✓" : i + 1}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-semibold mt-1 text-center max-w-[50px] truncate",
                              isCurr ? "text-white" : "text-white/65"
                            )}
                          >
                            {stg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/14 border border-white/18 text-xs text-white flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                  <span className="font-medium text-[11px]">
                    {ORDER_STAGES[currentStageIdx]?.desc || "Preparing your culinary order."}
                  </span>
                </div>

                <div className="divide-y divide-white/14 text-xs">
                  {ord.items?.map((it: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white">
                            {it.quantity}× {it.itemName}
                          </span>
                          {it.variantName && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold frost-pill-chip">
                              {it.variantName}
                            </span>
                          )}
                        </div>
                        {it.selectedModifiers && it.selectedModifiers.length > 0 && (
                          <p className="text-[10px] text-white/65">
                            {it.selectedModifiers.map((m: any) => m.name).join(", ")}
                          </p>
                        )}
                        {it.notes && (
                          <p className="text-[10px] text-white/80 italic">Note: {it.notes}</p>
                        )}
                      </div>
                      <span className="font-sans text-[11px] font-extrabold text-white">
                        {formatPrice(it.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {ord.special_instructions && (
                  <div className="text-[11px] text-white/80 bg-black/25 border border-white/12 p-3 rounded-2xl">
                    <span className="font-bold text-white">Delivery Note: </span>
                    {ord.special_instructions}
                  </div>
                )}

                {(taxEnabled || serviceChargeEnabled) && (
                  <div className="rounded-2xl bg-black/25 border border-white/12 px-3 py-2 text-[10px] text-white/75 space-y-1">
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

                <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-white/65 block">Folio Charge</span>
                    <span className="font-sans text-[14px] font-extrabold text-white sm:text-[15px]">
                      {formatPrice(ord.total_amount)}
                    </span>
                  </div>

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => onCancelOrder(ord.id)}
                      disabled={cancellingOrderId === ord.id}
                      className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 text-xs font-semibold rounded-full border border-rose-300/35 btn-smooth-press cursor-pointer"
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
        <div className="space-y-3 pt-4 border-t border-white/15">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block px-1">
            Delivered & Completed ({pastOrders.length})
          </span>

          <div className="space-y-3">
            {pastOrders.map((ord) => (
              <div
                key={ord.id}
                className="gsap-order-card p-4 frost-component-card rounded-[26px] text-xs space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono font-semibold text-white/85">
                    {ord.order_number}
                  </span>
                  <StatusBadge status={ord.status} variant="glass" />
                </div>

                <p className="text-[11px] text-white/75">
                  {ord.items
                    ?.map(
                      (it: any) =>
                        `${it.quantity}× ${it.itemName}${it.variantName ? ` (${it.variantName})` : ""}`
                    )
                    .join(", ")}
                </p>

                {(taxEnabled || serviceChargeEnabled) && (
                  <div className="rounded-xl bg-black/25 border border-white/12 px-3 py-2 text-[10px] text-white/70 space-y-1">
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

                <div className="flex justify-between items-center pt-2 border-t border-white/12 text-[11px]">
                  <span className="text-white/65">
                    {new Date(ord.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-sans text-[14px] font-extrabold text-white sm:text-[15px]">
                    {formatPrice(ord.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="gsap-order-card flex items-center justify-between rounded-[26px] frost-component-card px-5 py-3.5">
          <span className="text-sm font-semibold text-white/85">Total for this stay</span>
          <span className="font-sans text-[14px] font-extrabold text-white sm:text-[15px]">
            {formatPrice(billableOrdersTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
