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
      isOpen={isOpen}
      onClose={onClose}
      title={`Suite ${roomNumber || ""} Cart`}
      description="Review your culinary order and delivery requests"
    >
      <div className="space-y-5 text-xs">
        <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#E5DDD1] bg-[#FFFDF9] divide-y divide-[#E5DDD1]/70">
          {cart.map((line) => (
            <div key={line.cartItemId} className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-serif font-semibold text-sm leading-snug text-[#1E150F]">
                      {line.item.name}
                    </span>
                    {line.variantName && (
                      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                        {line.variantName}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 whitespace-nowrap font-sans text-[14px] font-extrabold tabular-nums text-[#29231F]">
                    {formatPrice(line.lineTotal)}
                  </span>
                </div>
                {line.selectedModifiers.length > 0 && (
                  <p className="text-[10px] text-[#73685C] truncate mt-0.5">
                    {line.selectedModifiers.map((m) => m.name).join(", ")}
                  </p>
                )}
                {line.notes && (
                  <p className="text-[10px] text-[#825C15] italic truncate mt-0.5">
                    Note: {line.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 rounded-full border border-[#E5DDD1] bg-[#FAF8F5] p-1">
                <button
                  onClick={() => onUpdateQuantity(line.cartItemId, -1)}
                  className="h-8 w-8 rounded-full bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-90 cursor-pointer"
                  aria-label={`Decrease ${line.item.name} quantity`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-sans text-xs font-bold tabular-nums w-5 text-center text-[#29231F]">
                  {line.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(line.cartItemId, 1)}
                  className="h-8 w-8 rounded-full bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-90 cursor-pointer"
                  aria-label={`Increase ${line.item.name} quantity`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
            Suite Delivery Instructions
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Please leave on the balcony table, knock softly..."
            value={deliveryNotes}
            onChange={(e) => onDeliveryNotesChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
          />
        </div>

        <div className="p-4 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl space-y-2 text-[11px]">
          <div className="flex justify-between text-[#73685C]">
            <span>Subtotal</span>
            <span className="font-sans font-semibold tabular-nums">{formatPrice(subtotal)}</span>
          </div>
          {taxEnabled && (
            <div className="flex justify-between text-[#73685C]">
              <span>GST / Tax ({property?.taxRatePercent}%)</span>
              <span className="font-sans font-semibold tabular-nums">{formatPrice(taxAmount)}</span>
            </div>
          )}
          {serviceChargeEnabled && (
            <div className="flex justify-between text-[#73685C]">
              <span>Service Charge ({property?.serviceChargePercent}%)</span>
              <span className="font-sans font-semibold tabular-nums">{formatPrice(serviceCharge)}</span>
            </div>
          )}
          <div className="pt-3 mt-1 border-t border-[#E5DDD1] flex items-baseline justify-between gap-3 font-bold text-sm text-[#1E150F]">
            <span className="font-serif">Total to Room Folio</span>
            <span className="font-sans text-[15px] sm:text-base font-extrabold tabular-nums text-[#29231F]">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>

        <button
          onClick={onSubmitOrder}
          disabled={isSubmitting || cart.length === 0}
          className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-[transform,background-color,box-shadow] duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[46px] btn-smooth-press"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Transmitting to Kitchen...
            </span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#B88223]" />
              Confirm Order to Suite {roomNumber}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
