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
      <Modal variant="glass" isOpen={false} onClose={onClose} title="">
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
    <Modal variant="glass" isOpen={Boolean(item)} onClose={onClose} title="">
      <div className="space-y-4 text-xs text-white">
        {item.imageUrl && (
          <div className="relative -mx-6 -mt-6 h-[200px] overflow-hidden">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            <div className="pointer-events-none absolute inset-0 frost-component-fade" />
            <div className="absolute top-3 left-4 flex flex-wrap gap-1">
              {item.dietaryFlags?.map((f) => (
                <DietaryBadge key={f} tag={f} variant="glass" className="text-[10px]" />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-sans text-xl sm:text-2xl font-bold leading-snug text-white break-words whitespace-normal">
              {item.name}
            </h2>
            <span className="shrink-0 rounded-full frost-pill-chip px-3 py-1 font-sans text-sm font-bold text-white tabular-nums">
              {formatPrice(singleUnitPrice)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/85 frost-pill-chip px-2.5 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-white/80" />~{item.prepTimeMinutes} mins prep
            </span>
            {selectedVariant && (
              <span className="inline-flex items-center text-[11px] font-medium text-white/85 frost-pill-chip px-2.5 py-0.5 rounded-full">
                {selectedVariant.name}
              </span>
            )}
          </div>

          {item.description && (
            <p className="mt-2.5 text-xs text-white/75 leading-relaxed break-words whitespace-normal">
              {item.description}
            </p>
          )}
        </div>

        {item.variants && item.variants.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/15">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                Select Portion / Size
              </label>
              <span className="text-[10px] text-white/70 font-semibold">Required</span>
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
                      !v.available && "opacity-45 cursor-not-allowed bg-white/5 border-white/10",
                      isSelected
                        ? "bg-white/22 border-white/40 text-white"
                        : "bg-black/22 border-white/15 text-white/80 hover:bg-white/12"
                    )}
                  >
                    <div className="flex items-center justify-between w-full gap-1.5">
                      <span className="font-sans font-bold text-xs text-white flex items-center gap-1.5">
                        {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                        {v.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-white/90">
                        {formatPrice(v.price)}
                      </span>
                    </div>
                    {!v.available && (
                      <span className="text-[9px] text-rose-300 font-semibold mt-0.5">Sold Out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {Object.entries(modGroups).map(([groupName, mods]) => (
          <div key={groupName} className="space-y-2 pt-3 border-t border-white/15">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/90">
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
                        ? "bg-white/22 border-white/40 text-white"
                        : "border-white/12 bg-black/20 hover:bg-white/12 text-white/80"
                    )}
                  >
                    <span className="font-semibold text-white flex items-center gap-2">
                      {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                      <span>{mod.name}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-white/85">
                      {Number(mod.priceDelta) > 0 ? `+${formatPrice(mod.priceDelta)}` : "Included"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/85 mb-1.5">
            Special Requests / In-Suite Preparation Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Extra hot, dressing on the side, no onions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 rounded-full border border-white/18 bg-black/25 text-xs text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
          />
        </div>

        <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 frost-pill-chip p-1.5 rounded-full">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full bg-white/12 flex items-center justify-center text-white active:scale-95 cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-sm font-bold w-6 text-center text-white">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-full bg-white/12 flex items-center justify-center text-white active:scale-95 cursor-pointer"
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
            className="flex-1 py-3 px-5 rounded-full font-bold text-xs frost-cta-white flex items-center justify-between min-h-[46px] btn-smooth-press cursor-pointer"
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
