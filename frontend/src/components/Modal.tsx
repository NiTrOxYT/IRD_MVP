import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1E150F]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5DDD1]/70 bg-[#F8F5EF]/50">
            <h3 className="font-serif text-xl font-semibold text-[#1E150F]">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#73685C] hover:text-[#1E150F] hover:bg-[#EAE2D5]/50 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
