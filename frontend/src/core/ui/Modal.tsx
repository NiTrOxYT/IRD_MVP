import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "./utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string | null;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
  variant?: "light" | "glass";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-lg",
  className,
  variant = "light",
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
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const isGlass = variant === "glass";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 backdrop-fade-enter",
          isGlass ? "bg-[#0E0906]/82" : "bg-[#1E150F]/72"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet on mobile, centered modal on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full flex-col sm:my-auto rounded-t-[32px] sm:rounded-[32px] overflow-hidden zomato-sheet-enter",
          isGlass
            ? "frost-component-card text-white"
            : "bg-[#FFFDF9] border border-[#E5DDD1] shadow-[0_28px_70px_-15px_rgba(18,12,8,0.45)]",
          maxWidth,
          className
        )}
      >
        <div
          className={cn(
            "mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full sm:hidden",
            isGlass ? "bg-white/30" : "bg-[#DCD2C4]"
          )}
          aria-hidden="true"
        />
        {!title && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer",
              isGlass
                ? "glass-pill text-white hover:bg-white/25"
                : "border border-[#E5DDD1] bg-[#FFFDF9]/95 text-[#39291F] hover:bg-white"
            )}
            aria-label="Close dialog"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
        {title && (
          <div
            className={cn(
              "relative shrink-0 px-6 py-5 border-b",
              isGlass ? "border-white/15 bg-white/[0.04]" : "border-[#E5DDD1] bg-[#FAF8F5]/80"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  className={cn(
                    "font-serif text-xl sm:text-2xl font-bold tracking-tight",
                    isGlass ? "text-white" : "text-[#1E150F]"
                  )}
                >
                  {title}
                </h3>
                {description && (
                  <p className={cn("text-xs mt-1", isGlass ? "text-white/70" : "text-[#73685C]")}>
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "rounded-full p-2 transition-colors btn-smooth-press cursor-pointer",
                  isGlass
                    ? "glass-pill text-white"
                    : "text-[#73685C] hover:text-[#1E150F] hover:bg-[#EAE2D5]/60"
                )}
                aria-label="Close dialog"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            {!isGlass && <div className="absolute bottom-0 left-6 right-6 gold-hairline opacity-60" />}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div
            className={cn(
              "shrink-0 border-t px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4",
              isGlass
                ? "border-white/15 bg-[#120D0A]/90"
                : "border-[#EDE1D3] bg-[#FFFDF9]/98"
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
