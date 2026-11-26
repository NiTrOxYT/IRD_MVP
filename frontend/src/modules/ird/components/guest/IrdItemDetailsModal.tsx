import React, { useEffect, useState } from "react";
import { Check, Clock, Minus, Plus } from "lucide-react";
import { Modal } from "../../../../core/ui/Modal";
import { cn } from "../../../../core/ui/utils";
import { useIrdAdapter } from "../../adapter";
import { DietaryBadge } from "../DietaryBadge";
import type { ItemModifier, MenuItem, MenuItemVariant } from "../../types";

interface IrdItemDetailsModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    variant: MenuItemVariant | null,
    modifiers: ItemModifier[],
    notes: string,
    qty: number
  ) => void;
}

export function IrdItemDetailsModal({ item, onClose, onAddToCart }: IrdItemDetailsModalProps) {
  const { formatPrice } = useIrdAdapter();
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedMods, setSelectedMods] = useState<Record<string, ItemModifier>>({});
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!item) return;
    if (item.variants && item.variants.length > 0) {
      const firstAvailable = item.variants.find((v) => v.available) || item.variants[0];
      setSelectedVariant(firstAvailable || null);
    } else {
      setSelectedVariant(null);
    }
    const defaults: Record<string, ItemModifier> = {};
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((m) => {
        if (m.isDefault) defaults[m.groupName] = m;
      });
    }
    setSelectedMods(defaults);
    setNotes("");
    setQuantity(1);
  }, [item]);

  if (!item) {
    return (
      <Modal variant="light" isOpen={false} onClose={onClose} title="">
        {null}
      </Modal>
    );
  }

  const currentBasePrice = selectedVariant ? Number(selectedVariant.price) : Number(item.price);
  const modTotal = Object.values(selectedMods).reduce((acc, m) => acc + Number(m.priceDelta), 0);
  const singleUnitPrice = currentBasePrice + modTotal;
  const currentLineTotal = singleUnitPrice * quantity;

  const modGroups: Record<string, ItemModifier[]> = {};
  if (item.modifiers) {
    item.modifiers.forEach((m) => {
      if (!modGroups[m.groupName]) modGroups[m.groupName] = [];
      modGroups[m.groupName].push(m);
    });
  }

  return (
    <Modal variant="light" isOpen={Boolean(item)} onClose={onClose} title="">
      <div className="space-y-4 text-xs text-[#3D1C11]">
        {item.imageUrl && (
          <div className="relative -mx-6 -mt-6 h-[200px] overflow-hidden bg-[#F4E9DB]">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            <div className="absolute top-3 left-4 flex flex-wrap gap-1">
              {item.dietaryFlags?.map((f) => (
                <DietaryBadge key={f} tag={f} variant="light" className="text-[10px]" />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-sans text-xl sm:text-2xl font-bold leading-snug text-[#3D1C11] break-words whitespace-normal">
              {item.name}
            </h2>
            <span className="shrink-0 rounded-full bg-[#FAF3EA] border border-[#E5D7C6] px-3 py-1 font-sans text-sm font-bold text-[#3D1C11] tabular-nums">
              {formatPrice(singleUnitPrice)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B4137] bg-[#FAF3EA] border border-[#EAE0D4] px-2.5 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-[#C44D27]" />~{item.prepTimeMinutes} mins prep
            </span>
            {selectedVariant && (
              <span className="inline-flex items-center text-[11px] font-medium text-[#5B4137] bg-[#FAF3EA] border border-[#EAE0D4] px-2.5 py-0.5 rounded-full">
                {selectedVariant.name}
              </span>
            )}
          </div>

          {item.description && (
            <p className="mt-2.5 text-xs text-[#7B5F54] leading-relaxed break-words whitespace-normal">
              {item.description}
            </p>
          )}
        </div>

        {item.variants && item.variants.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-[#EDE1D3]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D1C11]">
                Select Portion / Size
              </label>
              <span className="text-[10px] text-[#7B5F54] font-semibold">Required</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {item.variants.map((v) => {
                const isSelected =
                  selectedVariant?.id === v.id || (!selectedVariant && v.id === item.variants![0].id);
                return (
                  <button
                    key={v.id || v.name}
                    type="button"
                    disabled={!v.available}
                    onClick={() => setSelectedVariant(v)}
                    className={cn(
                      "flex flex-col p-3 rounded-2xl text-left transition-colors btn-smooth-press cursor-pointer border",
                      !v.available && "opacity-45 cursor-not-allowed bg-[#F4E9DB] border-[#E5D7C6]",
                      isSelected
                        ? "bg-[#C44D27]/10 border-[#C44D27] text-[#3D1C11]"
                        : "bg-[#FAF3EA] border-[#EAE0D4] text-[#5B4137] hover:bg-[#F3E7DA]"
                    )}
                  >
                    <div className="flex items-center justify-between w-full gap-1.5">
                      <span className="font-sans font-bold text-xs text-[#3D1C11] flex items-center gap-1.5">
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#C44D27] shrink-0" />}
                        {v.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#3D1C11]">
                        {formatPrice(v.price)}
                      </span>
                    </div>
                    {!v.available && (
                      <span className="text-[9px] text-rose-600 font-semibold mt-0.5">Sold Out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {Object.entries(modGroups).map(([groupName, mods]) => (
          <div key={groupName} className="space-y-2 pt-3 border-t border-[#EDE1D3]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3D1C11]">
              {groupName}
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {mods.map((mod) => {
                const isSelected = selectedMods[groupName]?.id === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() =>
                      setSelectedMods((prev) => ({
                        ...prev,
                        [groupName]: mod,
                      }))
                    }
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-medium transition-colors text-left btn-smooth-press min-h-[42px] cursor-pointer border",
                      isSelected
                        ? "bg-[#C44D27]/10 border-[#C44D27] text-[#3D1C11]"
                        : "border-[#EAE0D4] bg-[#FAF3EA] hover:bg-[#F3E7DA] text-[#5B4137]"
                    )}
                  >
                    <span className="font-semibold text-[#3D1C11] flex items-center gap-2">
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#C44D27] shrink-0" />}
                      <span>{mod.name}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-[#5B4137]">
                      {Number(mod.priceDelta) > 0 ? `+${formatPrice(mod.priceDelta)}` : "Included"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5B4137] mb-1.5">
            Special Requests / In-Suite Preparation Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Extra hot, dressing on the side, no onions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 rounded-full border border-[#E5D7C6] bg-[#FAF3EA] text-xs text-[#3D1C11] placeholder:text-[#9A7F74] focus:border-[#C44D27] focus:outline-none"
          />
        </div>

        <div className="pt-3 border-t border-[#EDE1D3] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 border border-[#EAE0D4] bg-[#FAF3EA] p-1.5 rounded-full">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full bg-white border border-[#E5D7C6] flex items-center justify-center text-[#3D1C11] active:scale-95 cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-sm font-bold w-6 text-center text-[#3D1C11]">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-full bg-[#C44D27] flex items-center justify-center text-white active:scale-95 cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              onAddToCart(item, selectedVariant, Object.values(selectedMods), notes, quantity)
            }
            className="flex-1 py-3 px-5 rounded-full font-bold text-xs bg-[#C44D27] hover:bg-[#B2411D] text-white flex items-center justify-between min-h-[46px] btn-smooth-press cursor-pointer shadow-[0_10px_24px_-8px_rgba(196,77,39,0.55)]"
          >
            <span>Add to Order</span>
            <span className="font-mono font-bold text-sm">
              {formatPrice(currentLineTotal)}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
