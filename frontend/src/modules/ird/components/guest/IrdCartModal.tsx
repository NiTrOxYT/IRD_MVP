import React from "react";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { Modal } from "../../../../core/ui/Modal";
import { useIrdAdapter } from "../../adapter";
import type { CartLineItem, IrdPropertyConfig } from "../../types";

interface IrdCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber?: string;
  cart: CartLineItem[];
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  property?: IrdPropertyConfig | null;
  isSubmitting: boolean;
  onSubmitOrder: () => void;
}

export function IrdCartModal({
  isOpen,
  onClose,
  roomNumber,
  cart,
  onUpdateQuantity,
  deliveryNotes,
  onDeliveryNotesChange,
  subtotal,
  taxAmount,
  serviceCharge,
  totalAmount,
  property,
  isSubmitting,
  onSubmitOrder,
}: IrdCartModalProps) {
  const { formatPrice } = useIrdAdapter();
  const taxEnabled = Number(property?.taxRatePercent || 0) > 0;
  const serviceChargeEnabled = Number(property?.serviceChargePercent || 0) > 0;

  return (
    <Modal
      variant="glass"
      isOpen={isOpen}
      onClose={onClose}
      title={`Suite ${roomNumber || ""} Cart`}
      description="Review your culinary order and delivery requests"
    >
      <div className="space-y-5 text-xs text-white">
        <div className="max-h-56 overflow-y-auto rounded-[22px] bg-black/22 border border-white/14 divide-y divide-white/12">
          {cart.map((line) => (
            <div key={line.cartItemId} className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-sans font-semibold text-sm leading-snug text-white">
                      {line.item.name}
                    </span>
                    {line.variantName && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold frost-pill-chip">
                        {line.variantName}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 whitespace-nowrap font-sans text-[14px] font-extrabold tabular-nums text-white">
                    {formatPrice(line.lineTotal)}
                  </span>
                </div>
                {line.selectedModifiers.length > 0 && (
                  <p className="text-[10px] text-white/65 truncate mt-0.5">
                    {line.selectedModifiers.map((m) => m.name).join(", ")}
                  </p>
                )}
                {line.notes && (
                  <p className="text-[10px] text-white/80 italic truncate mt-0.5">
                    Note: {line.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 rounded-full frost-pill-chip p-1">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(line.cartItemId, -1)}
                  className="h-7 w-7 rounded-full frost-cta-white flex items-center justify-center active:scale-90 cursor-pointer"
                  aria-label={`Decrease ${line.item.name} quantity`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-sans text-xs font-bold tabular-nums w-5 text-center text-white">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(line.cartItemId, 1)}
                  className="h-7 w-7 rounded-full frost-cta-white flex items-center justify-center active:scale-90 cursor-pointer"
                  aria-label={`Increase ${line.item.name} quantity`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/85 mb-1.5">
            Suite Delivery Instructions
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Please leave on the balcony table, knock softly..."
            value={deliveryNotes}
            onChange={(e) => onDeliveryNotesChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl border border-white/18 bg-black/25 text-xs text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
          />
        </div>

        <div className="p-4 bg-black/22 border border-white/14 rounded-[22px] space-y-2 text-[11px]">
          <div className="flex justify-between text-white/75">
            <span>Subtotal</span>
            <span className="font-sans font-semibold tabular-nums text-white">{formatPrice(subtotal)}</span>
          </div>
          {taxEnabled && (
            <div className="flex justify-between text-white/75">
              <span>GST / Tax ({property?.taxRatePercent}%)</span>
              <span className="font-sans font-semibold tabular-nums text-white">{formatPrice(taxAmount)}</span>
            </div>
          )}
          {serviceChargeEnabled && (
            <div className="flex justify-between text-white/75">
              <span>Service Charge ({property?.serviceChargePercent}%)</span>
              <span className="font-sans font-semibold tabular-nums text-white">{formatPrice(serviceCharge)}</span>
            </div>
          )}
          <div className="pt-3 mt-1 border-t border-white/15 flex items-baseline justify-between gap-3 font-bold text-sm text-white">
            <span>Total to Room Folio</span>
            <span className="font-sans text-[15px] sm:text-base font-extrabold tabular-nums text-white">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmitOrder}
          disabled={isSubmitting || cart.length === 0}
          className="w-full py-3.5 px-5 rounded-full font-bold text-xs frost-cta-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[46px] btn-smooth-press"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#171714] border-t-transparent rounded-full animate-spin" />
              Transmitting to Kitchen...
            </span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Confirm Order to Suite {roomNumber}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
