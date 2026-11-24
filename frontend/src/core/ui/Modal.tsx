import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "./utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string | null;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
  className,
}: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1E150F]/65 backdrop-blur-sm backdrop-fade-enter"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Card Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full my-auto bg-white border border-[rgba(20,18,16,0.12)] rounded-xl shadow-[0_24px_60px_-15px_rgba(14,12,10,0.38)] overflow-hidden modal-3d-enter",
          maxWidth,
          className
        )}
      >
        {!title && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#E5DDD1] bg-[#FFFDF9]/95 text-[#39291F] shadow-md backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B88223]"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {title && (
          <div className="relative px-6 py-5 border-b border-[#E5DDD1] bg-[#FAF8F5]/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1E150F] tracking-tight">
                  {title}
                </h3>
                {description && (
                  <p className="text-xs text-[#73685C] mt-1">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-[#73685C] hover:text-[#1E150F] hover:bg-[#EAE2D5]/60 transition-colors btn-smooth-press"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Subtle luxury gold accent hairline */}
            <div className="absolute bottom-0 left-6 right-6 gold-hairline opacity-60" />
          </div>
        )}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
