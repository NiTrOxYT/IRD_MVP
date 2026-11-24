import React, { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { StatusBadge } from "../../../../core/ui/StatusBadge";
import { ArchClocheIcon } from "../../../../core/ui/EnterpriseIcons";
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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between border-b border-[rgba(20,18,16,0.09)] pb-3">
        <div>
          <p className="text-xs text-[#847C73] tabular-nums">Suite {roomNumber}</p>
          <h1 className="font-serif text-2xl font-semibold tracking-[-0.01em] text-[#141210]">
            Order Status & Folio
          </h1>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(20,18,16,0.12)] bg-white px-3 text-xs font-medium text-[#141210] hover:border-[rgba(20,18,16,0.26)] btn-smooth-press-sm"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#5C554E]" strokeWidth={1.5} />
          <span>Refresh</span>
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="rounded-xl border border-[rgba(20,18,16,0.1)] bg-white p-8 text-center">
          <ArchClocheIcon className="mx-auto mb-3 h-7 w-7 text-[#847C73]" strokeWidth={1.3} />
          <h2 className="font-serif text-lg font-semibold text-[#141210]">No active dining orders</h2>
          <p className="mt-1 mb-4 text-xs text-[#5C554E]">
            Orders placed from the suite menu will appear here with live kitchen progress.
          </p>
          <button
            type="button"
            onClick={onExploreMenu}
            className="rounded-lg bg-[#141210] px-4 py-2 text-xs font-medium text-white hover:bg-[#2B2622] btn-smooth-press"
          >
            Open Dining Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <span className="block text-xs font-medium text-[#5C554E] tabular-nums">
            Active tickets ({activeOrders.length})
          </span>

          {activeOrders.map((ord) => {
            const currentStageIdx = ORDER_STAGES.findIndex((s) => s.key === ord.status);
            const isPending = ord.status === "pending";

            return (
              <div
                key={ord.id}
                className="space-y-4 rounded-xl border border-[rgba(20,18,16,0.1)] bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#B88223]">
                      {ord.order_number}
                    </span>
                    <span className="block text-[11px] text-[#73685C] mt-0.5">
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
                    <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-[#EAE2D5] -z-0 overflow-hidden">
                      <div
                        className="h-full w-full origin-left bg-[#B88223] transition-transform duration-500 ease-out"
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
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-[transform,background-color,border-color,color,box-shadow] duration-200 shadow-2xs",
                              isDone
                                ? "bg-[#B88223] text-white"
                                : isCurr
                                ? "bg-[#1E150F] text-[#B88223] ring-3 ring-[#B88223]/25"
                                : "bg-[#FAF8F5] text-[#73685C] border border-[#E5DDD1]"
                            )}
                          >
                            {isDone ? "✓" : i + 1}
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-semibold mt-1 text-center max-w-[50px] truncate",
                              isCurr ? "text-[#1E150F]" : "text-[#73685C]"
                            )}
                          >
                            {stg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E5DDD1]/70 text-xs text-[#1E150F] flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#B88223] animate-ping shrink-0" />
                  <span className="font-medium text-[11px]">
                    {ORDER_STAGES[currentStageIdx]?.desc || "Preparing your culinary order."}
                  </span>
                </div>

                <div className="divide-y divide-[#E5DDD1]/70 text-xs">
                  {ord.items?.map((it: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#1E150F]">
                            {it.quantity}× {it.itemName}
                          </span>
                          {it.variantName && (
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                              {it.variantName}
                            </span>
                          )}
                        </div>
                        {it.selectedModifiers && it.selectedModifiers.length > 0 && (
                          <p className="text-[10px] text-[#73685C]">
                            {it.selectedModifiers.map((m: any) => m.name).join(", ")}
                          </p>
                        )}
                        {it.notes && (
                          <p className="text-[10px] text-[#825C15] italic">Note: {it.notes}</p>
                        )}
                      </div>
                      <span className="font-sans text-[11px] font-extrabold text-[#29231F]">
                        {formatPrice(it.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {ord.special_instructions && (
                  <div className="text-[11px] text-[#73685C] bg-[#FAF8F5] p-3 rounded-2xl border border-[#E5DDD1]/60">
                    <span className="font-bold text-[#1E150F]">Delivery Note: </span>
                    {ord.special_instructions}
                  </div>
                )}

                {(taxEnabled || serviceChargeEnabled) && (
                  <div className="rounded-xl border border-[#E5DDD1]/70 bg-[#FAF8F5] px-3 py-2 text-[10px] text-[#73685C] space-y-1">
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

                <div className="pt-3 border-t border-[#E5DDD1] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#73685C] block">Folio Charge</span>
                    <span className="font-sans text-[14px] font-extrabold text-[#29231F] sm:text-[15px]">
                      {formatPrice(ord.total_amount)}
                    </span>
                  </div>

                  {isPending && (
                    <button
                      onClick={() => onCancelOrder(ord.id)}
                      disabled={cancellingOrderId === ord.id}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 btn-smooth-press cursor-pointer"
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
        <div className="space-y-3 pt-4 border-t border-[#E5DDD1]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#73685C] block">
            Delivered & Completed ({pastOrders.length})
          </span>

          <div className="space-y-3">
            {pastOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl text-xs space-y-2 opacity-90 shadow-2xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono font-semibold text-[#73685C]">
                    {ord.order_number}
                  </span>
                  <StatusBadge status={ord.status} />
                </div>

                <p className="text-[11px] text-[#73685C]">
                  {ord.items
                    ?.map(
                      (it: any) =>
                        `${it.quantity}× ${it.itemName}${it.variantName ? ` (${it.variantName})` : ""}`
                    )
                    .join(", ")}
                </p>

                {(taxEnabled || serviceChargeEnabled) && (
                  <div className="rounded-xl bg-[#FAF8F5] px-3 py-2 text-[10px] text-[#73685C] space-y-1">
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

                <div className="flex justify-between items-center pt-2 border-t border-[#E5DDD1]/60 text-[11px]">
                  <span className="text-[#73685C]">
                    {new Date(ord.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-sans text-[14px] font-extrabold text-[#29231F] sm:text-[15px]">
                    {formatPrice(ord.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-[#E5DDD1] bg-[#FAF3E6] px-4 py-3.5">
          <span className="text-sm font-semibold text-[#51473F]">Total for this stay</span>
          <span className="font-sans text-[14px] font-extrabold text-[#29231F] sm:text-[15px]">
            {formatPrice(billableOrdersTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
