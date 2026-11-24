import React from "react";
import { Send, Sparkles } from "lucide-react";
import { Modal } from "../../../../core/ui/Modal";
import type { RoomServiceCatalogItem } from "../../types";

interface RoomServiceRequestModalProps {
  service: RoomServiceCatalogItem | null;
  roomNumber?: string;
  guestName?: string;
  guestNote: string;
  onGuestNoteChange: (val: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RoomServiceRequestModal({
  service,
  roomNumber,
  guestName,
  guestNote,
  onGuestNoteChange,
  isSubmitting,
  onClose,
  onConfirm,
}: RoomServiceRequestModalProps) {
  return (
    <Modal
      isOpen={Boolean(service)}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title=""
    >
      {service && (
        <div className="space-y-4 text-xs">
          <div className="text-center pt-1 pb-2 border-b border-[#E5DDD1]">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF3E6] border border-[#ECD7A9] text-[#8E6314] flex items-center justify-center mx-auto mb-2 shadow-2xs">
              {React.createElement(service.icon, { className: "w-6 h-6" })}
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1E150F]">{service.title}</h3>
            <p className="text-xs text-[#73685C] mt-0.5">{service.desc}</p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#73685C]">Destination Suite:</span>
              <span className="font-bold text-[#1E150F]">Suite {roomNumber}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#73685C]">Guest Name:</span>
              <span className="font-semibold text-[#1E150F]">{guestName}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#73685C]">Service Charge:</span>
              <span className="font-semibold text-emerald-700">Complimentary In-Suite Care</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Special Instructions or Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please leave fresh towels on bathroom vanity, or deliver in 20 minutes..."
              value={guestNote}
              onChange={(e) => onGuestNoteChange(e.target.value)}
              className="w-full p-3 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30 placeholder-[#73685C]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-[#E5DDD1] text-xs font-semibold text-[#73685C] hover:bg-[#FAF8F5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-[#54321E] hover:bg-[#3D2314] text-white text-xs font-bold transition-[transform,background-color,box-shadow] duration-150 btn-smooth-press shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-[#ECD7A9]" />
                  <span>Transmitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#ECD7A9]" />
                  <span>Confirm Request</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
