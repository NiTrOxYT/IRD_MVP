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
    >
      {service && (
        <div className="space-y-4 text-xs text-white">
          <div className="text-center pt-1 pb-3 border-b border-white/15">
            <div className="w-12 h-12 rounded-full frost-pill-chip text-white flex items-center justify-center mx-auto mb-2.5">
              {React.createElement(service.icon, { className: "w-5 h-5" })}
            </div>
            <h3 className="font-sans text-lg font-bold text-white">{service.title}</h3>
            <p className="text-xs text-white/70 mt-0.5">{service.desc}</p>
          </div>

          <div className="bg-black/22 border border-white/14 rounded-[20px] p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-white/65">Destination Suite:</span>
              <span className="font-bold text-white">Suite {roomNumber}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-white/65">Guest Name:</span>
              <span className="font-semibold text-white">{guestName}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-white/65">Service Charge:</span>
              <span className="font-semibold text-emerald-300">Complimentary In-Suite Care</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/85 mb-1.5">
              Special Instructions or Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please leave fresh towels on bathroom vanity, or deliver in 20 minutes..."
              value={guestNote}
              onChange={(e) => onGuestNoteChange(e.target.value)}
              className="w-full p-3 rounded-2xl border border-white/18 bg-black/25 text-xs text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 rounded-full frost-pill-chip text-xs font-semibold text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="flex-1 py-3 rounded-full frost-cta-white text-xs font-bold btn-smooth-press flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Transmitting Request...</span>
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
