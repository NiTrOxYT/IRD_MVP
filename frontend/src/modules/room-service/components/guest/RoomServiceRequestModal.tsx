import React from "react";
import { LoaderCircle, Send } from "lucide-react";
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
      variant="glass"
      isOpen={Boolean(service)}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title=""
      className="!bg-[#1C1E16] !border-white/20 font-sans"
    >
      {service && (
        <div className="space-y-4 text-xs text-[#FAF8F2]">
          <div className="text-center pt-1 pb-3.5 border-b border-white/12">
            <div className="w-12 h-12 rounded-2xl border border-white/18 bg-white/[0.08] text-[#EAEEDB] flex items-center justify-center mx-auto mb-2.5">
              {React.createElement(service.icon, { className: "w-5 h-5" })}
            </div>
            <h3 className="font-sans text-xl font-bold tracking-tight text-[#FAF8F2]">{service.title}</h3>
            <p className="text-xs text-[#C7C3B4] mt-1">{service.desc}</p>
          </div>

          <div className="bg-[#15170F] border border-white/12 rounded-[18px] p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#B0AC9E]">Destination Suite</span>
              <span className="font-semibold text-[#FAF8F2] tabular-nums">Suite {roomNumber}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#B0AC9E]">Guest Name</span>
              <span className="font-semibold text-[#FAF8F2]">{guestName}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#B0AC9E]">Service Charge</span>
              <span className="font-semibold text-[#C5CE9F]">Complimentary In-Suite Care</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#E0DDD0] mb-1.5">
              Special Instructions or Preferred Timing (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please leave fresh towels on the bathroom vanity, or arrive in 20 minutes..."
              value={guestNote}
              onChange={(e) => onGuestNoteChange(e.target.value)}
              className="w-full p-3 rounded-2xl border border-white/14 bg-[#15170F] text-xs text-[#FAF8F2] placeholder:text-[#8E8A7C] focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 rounded-full frost-pill-chip text-xs font-semibold text-[#E6E2D4] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="flex-1 py-3 rounded-full frost-cta-white text-xs font-bold btn-smooth-press flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
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
