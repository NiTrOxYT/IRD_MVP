import React, { useEffect, useState } from "react";
import { Clock, Minus, Plus } from "lucide-react";
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
      <Modal isOpen={false} onClose={onClose} title="">
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
    <Modal isOpen={Boolean(item)} onClose={onClose} title="">
      <div className="space-y-4 text-xs">
        {item.imageUrl && (
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#EAE2D5] -mt-2 shadow-xs">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
              {item.dietaryFlags?.map((f) => (
                <DietaryBadge key={f} tag={f} className="bg-white/95 text-[10px] shadow-sm" />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold leading-snug text-[#1E150F] break-words whitespace-normal">
              {item.name}
            </h2>
            <div className="shrink-0 text-right">
              <span className="font-serif text-lg sm:text-xl font-bold text-[#1E150F]">
                {formatPrice(singleUnitPrice)}
              </span>
              {selectedVariant && (
                <span className="block text-[10px] font-medium text-[#766B61]">
                  {selectedVariant.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#766B61] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#E5DDD1]">
              <Clock className="w-3 h-3 text-[#B88223]" />~{item.prepTimeMinutes} mins prep
            </span>
            {item.dietaryFlags?.map((f) => (
              <DietaryBadge key={f} tag={f} />
            ))}
          </div>

          {item.description && (
            <p className="mt-2.5 text-xs text-[#73685C] leading-relaxed break-words whitespace-normal">
              {item.description}
            </p>
          )}
        </div>

        {item.variants && item.variants.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-[#E5DDD1]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                Select Portion / Size
              </label>
              <span className="text-[10px] text-[#8E6314] font-semibold">Required</span>
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
                      "flex flex-col p-3 rounded-2xl border text-left transition-[transform,background-color,border-color,color,box-shadow] duration-150 btn-smooth-press cursor-pointer",
                      !v.available && "opacity-50 cursor-not-allowed bg-stone-100 border-stone-200",
                      isSelected
                        ? "bg-[#FAF3E6] border-[#B88223] text-[#1E150F] shadow-2xs ring-1 ring-[#B88223]/40"
                        : "bg-[#FAF8F5] border-[#E5DDD1] text-[#73685C] hover:bg-[#F2ECE1]"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-serif font-bold text-xs text-[#1E150F]">{v.name}</span>
                      <span className="font-mono text-xs font-bold text-[#8E6314]">
                        {formatPrice(v.price)}
                      </span>
                    </div>
                    {!v.available && (
                      <span className="text-[9px] text-red-600 font-semibold mt-0.5">Sold Out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {Object.entries(modGroups).map(([groupName, mods]) => (
          <div key={groupName} className="space-y-2 pt-3 border-t border-[#E5DDD1]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
              {groupName}
            </label>
            <div className="grid grid-cols-1 gap-2">
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
                      "flex items-center justify-between p-3 rounded-2xl border text-xs font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-150 text-left btn-smooth-press min-h-[44px] cursor-pointer",
                      isSelected
                        ? "bg-[#FAF3E6] border-[#ECD7A9] text-[#8E6314] shadow-2xs"
                        : "bg-[#FAF8F5] border-[#E5DDD1] text-[#73685C] hover:bg-[#F0ECE1]"
                    )}
                  >
                    <span className="font-semibold text-[#1E150F]">{mod.name}</span>
                    <span className="font-mono text-xs font-bold text-[#8E6314]">
                      {Number(mod.priceDelta) > 0 ? `+${formatPrice(mod.priceDelta)}` : "Included"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
            Special Requests / In-Suite Preparation Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Extra hot, dressing on the side, no onions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
          />
        </div>

        <div className="pt-3 border-t border-[#E5DDD1] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-2xl border border-[#E5DDD1]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-95 cursor-pointer shadow-2xs"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-sm font-bold w-6 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] active:scale-95 cursor-pointer shadow-2xs"
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
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] shadow-md flex items-center justify-between min-h-[46px] btn-smooth-press cursor-pointer"
          >
            <span>Add to Order</span>
            <span className="font-mono font-bold text-sm text-[#ECD7A9]">
              {formatPrice(currentLineTotal)}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
