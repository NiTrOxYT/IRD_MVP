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
      className="!bg-[#1A1714] !border-[#C8A262]/28"
    >
      {service && (
        <div className="space-y-4 text-xs text-[#FAF6EE]">
          <div className="text-center pt-1 pb-3.5 border-b border-white/10">
            <div className="w-12 h-12 rounded-2xl border border-[#C8A262]/35 bg-[#26211B] text-[#E5C58B] flex items-center justify-center mx-auto mb-2.5">
              {React.createElement(service.icon, { className: "w-5 h-5" })}
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#FAF6EE]">{service.title}</h3>
            <p className="text-xs text-[#B5ACA0] mt-1">{service.desc}</p>
          </div>

          <div className="bg-[#13110F] border border-white/10 rounded-[18px] p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#9E9589]">Destination Suite</span>
              <span className="font-semibold text-[#FAF6EE] tabular-nums">Suite {roomNumber}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#9E9589]">Guest Name</span>
              <span className="font-semibold text-[#FAF6EE]">{guestName}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#9E9589]">Service Charge</span>
              <span className="font-semibold text-[#E5C58B]">Complimentary In-Suite Care</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#D6CEC2] mb-1.5">
              Special Instructions or Preferred Timing (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please leave fresh towels on the bathroom vanity, or arrive in 20 minutes..."
              value={guestNote}
              onChange={(e) => onGuestNoteChange(e.target.value)}
              className="w-full p-3 rounded-2xl border border-white/12 bg-[#13110F] text-xs text-[#FAF6EE] placeholder:text-[#7E766B] focus:border-[#C8A262]/60 focus:outline-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-white/14 bg-[#25211C] text-xs font-semibold text-[#DED6CA] hover:bg-[#2F2A24] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="flex-1 py-3 rounded-full bg-[#F6F1E9] hover:bg-white text-xs font-bold text-[#181512] btn-smooth-press flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
