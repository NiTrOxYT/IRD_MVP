import React, { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Coffee,
  Croissant,
  Flame,
  MapPin,
  Minus,
  Plus,
  Search,
  Utensils,
  X,
} from "lucide-react";
import { SuiteCareBellIcon } from "../../../../core/ui/CustomResortIcons";
import { setupScrollBatchCards, smoothScrollToTarget, useGSAP } from "../../../../core/ui/gsap";
import { cn } from "../../../../core/ui/utils";
import { useIrdAdapter } from "../../adapter";
import { DietaryBadge } from "../DietaryBadge";
import { IrdHeroBanner } from "./IrdHeroBanner";
import type { CartLineItem, Category, IrdPropertyConfig, MenuItem } from "../../types";

interface IrdMenuBrowserProps {
  roomNumber?: string;
  categories: Category[];
  items: MenuItem[];
  menuLoading: boolean;
  property?: IrdPropertyConfig | null;
  cart: CartLineItem[];
  onOpenItemDetails: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  onUpdateCartQuantity: (cartItemId: string, delta: number) => void;
  onSwitchToRoomService?: () => void;
}

export function IrdMenuBrowser({
  roomNumber,
  categories,
  items,
  menuLoading,
  property,
  cart,
  onOpenItemDetails,
  onQuickAdd,
  onUpdateCartQuantity,
  onSwitchToRoomService,
}: IrdMenuBrowserProps) {
  const { formatPrice } = useIrdAdapter();
  const browserRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");
  const [menuSort, setMenuSort] = useState("recommended");

  const getItemCartQuantity = (itemId: number) =>
    cart.filter((c) => c.item.id === itemId).reduce((acc, c) => acc + c.quantity, 0);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (selectedCategory !== "all" && item.categoryId !== selectedCategory) return false;
        if (dietaryFilter !== "all") {
          const flags = item.dietaryFlags || [];
          if (dietaryFilter === "veg" && !flags.includes("veg") && !flags.includes("vegetarian")) {
            return false;
          }
          if (
            dietaryFilter === "non_veg" &&
            !flags.includes("non_veg") &&
            !flags.includes("non-veg") &&
            !flags.includes("nonveg")
          ) {
            return false;
          }
          if (dietaryFilter === "vegan" && !flags.includes("vegan")) return false;
          if (
            dietaryFilter === "gluten_free" &&
            !flags.includes("gluten_free") &&
            !flags.includes("gluten-free")
          ) {
            return false;
          }
          if (dietaryFilter === "spicy" && !flags.includes("spicy")) return false;
          if (
            dietaryFilter === "chef_special" &&
            !flags.includes("chef_special") &&
            !flags.includes("signature")
          ) {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            (item.description || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (menuSort === "price_low") return Number(a.price) - Number(b.price);
        if (menuSort === "price_high") return Number(b.price) - Number(a.price);
        if (menuSort === "quickest") return Number(a.prepTimeMinutes) - Number(b.prepTimeMinutes);
        return 0;
      });
  }, [items, selectedCategory, dietaryFilter, searchQuery, menuSort]);

  const itemSections = useMemo(() => {
    if (selectedCategory === "all" && !searchQuery.trim()) {
      return categories
        .map((category) => ({
          id: category.id,
          title: category.name,
          items: filteredItems.filter((item) => item.categoryId === category.id),
        }))
        .filter((section) => section.items.length > 0);
    }
    const category = categories.find((entry) => entry.id === selectedCategory);
    return [{ id: category?.id ?? "search-results", title: category?.name ?? "Search Results", items: filteredItems }];
  }, [categories, filteredItems, searchQuery, selectedCategory]);

  const chefsPicks = useMemo(() => {
    const specials = items.filter(
      (item) =>
        item.available &&
        item.dietaryFlags?.some((flag) => ["chef_special", "signature"].includes(flag.toLowerCase()))
    );
    return (specials.length > 0 ? specials : items.filter((i) => i.available)).slice(0, 6);
  }, [items]);

  const categoryThumbs = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((cat) => {
      const firstWithImg = items.find((i) => i.categoryId === cat.id && i.imageUrl);
      if (firstWithImg?.imageUrl) map.set(cat.id, firstWithImg.imageUrl);
    });
    return map;
  }, [categories, items]);

  useGSAP(
    () => {
      const el = browserRef.current;
      if (!el || menuLoading || items.length === 0) return;
      setupScrollBatchCards(el, ".gsap-menu-card", { stagger: 0.035, y: 12, start: "top 95%" });
    },
    {
      scope: browserRef,
      dependencies: [menuLoading, selectedCategory],
      revertOnUpdate: true,
    }
  );

  return (
    <div ref={browserRef} className="mx-auto max-w-md space-y-5 sm:max-w-2xl sm:space-y-6 lg:max-w-4xl">
      {/* Deliver to Suite + Search Pill (matching reference delivery bar) */}
      <div className="rounded-[22px] border border-[#EAE0D4] bg-[#FFFBF6] px-4 py-2.5 shadow-[0_8px_22px_-12px_rgba(64,28,12,0.14)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C44D27]/12 text-[#C44D27]">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold text-[#7B5F54] tabular-nums">
              Deliver to Suite {roomNumber || "Guest"}
            </span>
            <input
              id="ird-menu-search"
              type="text"
              placeholder="Search dishes, coffees, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[13px] font-bold text-[#3D1C11] placeholder:font-medium placeholder:text-[#9A7F74] focus:outline-none"
            />
          </div>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4E9DB] text-[#3D1C11] hover:bg-[#EBD9C5] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => document.getElementById("ird-menu-search")?.focus()}
              aria-label="Search menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#3D1C11] hover:bg-[#F4E9DB] cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Terracotta Promo Banner */}
      <IrdHeroBanner property={property} />

      {/* Category Thumbnail Tiles Strip */}
      <div id="ird-menu-items" className="space-y-3">
        <div className="flex gap-2.5 overflow-x-auto py-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "w-[74px] shrink-0 rounded-[18px] border p-2 text-center transition-[border-color,background-color,box-shadow] cursor-pointer btn-smooth-press-sm",
              selectedCategory === "all"
                ? "border-[#C44D27] bg-white shadow-[0_8px_20px_-8px_rgba(196,77,39,0.28)]"
                : "border-[#EAE0D4] bg-[#FFFBF6] hover:border-[#D9C7B4]"
            )}
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4E9DB] text-[#C44D27]">
              <Utensils className="h-5 w-5" />
            </div>
            <span className="mt-1.5 block truncate text-[11px] font-bold text-[#3D1C11]">All</span>
          </button>

          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            const thumb = categoryThumbs.get(cat.id);
            const isDessert =
              cat.name.toLowerCase().includes("dessert") || cat.name.toLowerCase().includes("sweet");
            const isDrink =
              cat.name.toLowerCase().includes("drink") ||
              cat.name.toLowerCase().includes("coffee") ||
              cat.name.toLowerCase().includes("beverage");
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "w-[78px] shrink-0 rounded-[18px] border p-2 text-center transition-[border-color,background-color,box-shadow] cursor-pointer btn-smooth-press-sm",
                  active
                    ? "border-[#C44D27] bg-white shadow-[0_8px_20px_-8px_rgba(196,77,39,0.28)]"
                    : "border-[#EAE0D4] bg-[#FFFBF6] hover:border-[#D9C7B4]"
                )}
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#F4E9DB] text-[#C44D27]">
                  {thumb ? (
                    <img src={thumb} alt={cat.name} className="h-full w-full object-cover" />
                  ) : isDessert ? (
                    <Croissant className="h-5 w-5" />
                  ) : isDrink ? (
                    <Coffee className="h-5 w-5" />
                  ) : (
                    <Utensils className="h-5 w-5" />
                  )}
                </div>
                <span className="mt-1.5 block truncate text-[11px] font-semibold text-[#3D1C11]">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dietary Chips + Sort Strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "all", label: "All" },
              { id: "veg", label: "Pure Veg" },
              { id: "non_veg", label: "Non-Veg" },
              { id: "chef_special", label: "Bestsellers" },
              { id: "spicy", label: "Spicy" },
            ].map((diet) => (
              <button
                key={diet.id}
                type="button"
                onClick={() => setDietaryFilter(diet.id)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors btn-smooth-press-sm cursor-pointer",
                  dietaryFilter === diet.id
                    ? "border-[#C44D27] bg-[#C44D27] text-white"
                    : "border-[#EAE0D4] bg-[#FFFBF6] text-[#5B4137] hover:bg-[#F3E7DA]"
                )}
              >
                {diet.label}
              </button>
            ))}
          </div>

          <div className="relative shrink-0">
            <select
              aria-label="Sort dishes"
              value={menuSort}
              onChange={(e) => setMenuSort(e.target.value)}
              className="appearance-none rounded-full border border-[#EAE0D4] bg-[#FFFBF6] py-1.5 pl-3 pr-7 text-[11px] font-bold text-[#3D1C11] focus:border-[#C44D27] focus:outline-none"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: Low–High</option>
              <option value="price_high">Price: High–Low</option>
              <option value="quickest">Fastest Prep</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7B5F54]" />
          </div>
        </div>
      </div>

      {/* Popular Picks Horizontal Strip (exact Tortilla 3-column mobile look) */}
      {dietaryFilter === "all" && selectedCategory === "all" && !searchQuery && chefsPicks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="font-sans text-[17px] sm:text-xl font-bold tracking-tight text-[#3D1C11]">
              Popular Picks
            </h2>
            <button
              type="button"
              onClick={() => smoothScrollToTarget("#ird-full-menu", 68)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B5F54] hover:text-[#C44D27] cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
            {chefsPicks.map((item) => {
              const qtyInCart = getItemCartQuantity(item.id);
              const hasVariants = Boolean(item.variants && item.variants.length > 0);
              const isCustomizable = hasVariants || Boolean(item.modifiers && item.modifiers.length > 0);
              const minPrice = hasVariants
                ? Math.min(...item.variants!.map((v) => Number(v.price)))
                : Number(item.price);

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenItemDetails(item)}
                  className="gsap-menu-card group w-[148px] sm:w-auto shrink-0 snap-start rounded-[22px] border border-[#EAE0D4] bg-[#FFFBF6] p-2.5 shadow-[0_8px_22px_-14px_rgba(64,28,12,0.16)] flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="relative h-[98px] sm:h-[118px] w-full overflow-hidden rounded-[16px] bg-[#F4E9DB]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#C44D27]">
                          <Utensils className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-[#4B2316]/85 px-2 py-0.5 text-[9.5px] font-bold text-white">
                        <Flame className="h-2.5 w-2.5 text-[#FF8C5A]" /> Hot
                      </span>
                    </div>

                    <h3 className="mt-2 font-sans text-[13px] font-bold leading-snug text-[#3D1C11] line-clamp-2 min-h-[34px]">
                      {item.name}
                    </h3>
                  </div>

                  <div
                    className="mt-2.5 flex items-center justify-between gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-sans text-[13.5px] font-bold text-[#5E453B] tabular-nums">
                      {hasVariants ? formatPrice(minPrice) : formatPrice(item.price)}
                    </span>

                    {qtyInCart > 0 && !isCustomizable ? (
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#C44D27] px-2 text-[11px] font-bold text-white tabular-nums">
                        {qtyInCart}×
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => (isCustomizable ? onOpenItemDetails(item) : onQuickAdd(item))}
                        aria-label={`Add ${item.name}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C44D27] text-white shadow-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Full Menu Sections */}
      <div id="ird-full-menu">
        {menuLoading ? (
          <div className="rounded-[26px] border border-[#EAE0D4] bg-[#FFFBF6] py-12 text-center text-xs text-[#7B5F54]">
            <div className="w-7 h-7 rounded-full border-2 border-[#C44D27] border-t-transparent animate-spin mx-auto mb-2.5" />
            Loading freshly plated culinary menu...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[26px] border border-[#EAE0D4] bg-[#FFFBF6] p-8 text-center my-6">
            <Utensils className="w-8 h-8 text-[#C44D27] mx-auto mb-2.5" />
            <h3 className="font-sans text-base font-bold text-[#3D1C11]">No items match your filter</h3>
            <p className="text-xs text-[#7B5F54] mt-1">
              Try adjusting your search query or dietary preferences.
            </p>
          </div>
        ) : (
          <div className="space-y-7 pt-1">
            {itemSections.map((section) => (
              <section key={section.id} className="space-y-3">
                {section.title && (
                  <div className="flex items-baseline justify-between border-b border-[#E7DACB] pb-2 px-0.5">
                    <h2 className="font-sans text-[17px] sm:text-xl font-bold tracking-tight text-[#3D1C11]">
                      {section.title}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof section.id === "number") setSelectedCategory(section.id);
                      }}
                      className="text-xs font-semibold text-[#7B5F54] hover:text-[#C44D27] tabular-nums cursor-pointer"
                    >
                      {section.items.length} {section.items.length === 1 ? "dish" : "dishes"}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {section.items.map((item) => {
                    const qtyInCart = getItemCartQuantity(item.id);
                    const isAvailable = item.available;
                    const hasVariants = Boolean(item.variants && item.variants.length > 0);
                    const isCustomizable = hasVariants || Boolean(item.modifiers && item.modifiers.length > 0);
                    const minPrice = hasVariants
                      ? Math.min(...item.variants!.map((v) => Number(v.price)))
                      : Number(item.price);

                    return (
                      <article
                        key={item.id}
                        onClick={() => isAvailable && onOpenItemDetails(item)}
                        className={cn(
                          "gsap-menu-card group flex gap-3.5 rounded-[24px] border border-[#EAE0D4] bg-[#FFFBF6] p-3.5 shadow-[0_8px_22px_-14px_rgba(64,28,12,0.14)]",
                          !isAvailable ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        {/* Left Clean Square Food Photo */}
                        {item.imageUrl && (
                          <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-[18px] bg-[#F4E9DB]">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              className={cn("h-full w-full object-cover", !isAvailable && "grayscale")}
                            />
                          </div>
                        )}

                        {/* Right Details + Terracotta Add / Stepper */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-sans text-[15px] sm:text-base font-bold leading-snug text-[#3D1C11] line-clamp-2">
                                {item.name}
                              </h3>
                            </div>

                            {item.description && (
                              <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[#7B5F54]">
                                {item.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              <span className="inline-flex items-center gap-1 rounded-md border border-[#EAE0D4] bg-[#FAF3EA] px-1.5 py-0.5 text-[10px] font-semibold text-[#5E453B] tabular-nums">
                                <Clock className="h-2.5 w-2.5 text-[#C44D27]" />
                                {item.prepTimeMinutes}m
                              </span>
                              {item.dietaryFlags?.map((f) => (
                                <DietaryBadge key={f} tag={f} variant="light" />
                              ))}
                            </div>
                          </div>

                          <div
                            className="mt-2.5 flex items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-sans text-[14px] sm:text-[15px] font-extrabold text-[#3D1C11] tabular-nums">
                              {hasVariants ? `From ${formatPrice(minPrice)}` : formatPrice(item.price)}
                            </span>

                            {!isAvailable ? (
                              <span className="rounded-full bg-[#F4E9DB] px-3 py-1 text-[11px] font-semibold text-[#7B5F54]">
                                Sold Out
                              </span>
                            ) : isCustomizable ? (
                              <button
                                type="button"
                                onClick={() => onOpenItemDetails(item)}
                                className="inline-flex h-8 items-center gap-1 rounded-full bg-[#C44D27] px-3.5 text-[11px] font-bold text-white shadow-xs btn-smooth-press cursor-pointer"
                              >
                                <span>{qtyInCart > 0 ? `Custom (${qtyInCart})` : "Select"}</span>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            ) : qtyInCart > 0 ? (
                              <div className="inline-flex h-8 items-center gap-2 rounded-full bg-[#C44D27] px-2 text-white zomato-stepper-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const match = cart.find((c) => c.item.id === item.id);
                                    if (match) onUpdateCartQuantity(match.cartItemId, -1);
                                  }}
                                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/15 cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span
                                  key={qtyInCart}
                                  className="min-w-4 text-center text-xs font-extrabold tabular-nums zomato-qty-pop"
                                >
                                  {qtyInCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onQuickAdd(item)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/15 cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onQuickAdd(item)}
                                aria-label={`Add ${item.name} to tray`}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C44D27] text-white shadow-xs transition-transform hover:scale-105 btn-smooth-press cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Suite Concierge Callout Strip (matches Tortilla Rewards banner layout) */}
      {onSwitchToRoomService && (
        <div className="rounded-[22px] border border-[#EAE0D4] bg-[#FFFBF6] p-3.5 shadow-[0_8px_22px_-14px_rgba(64,28,12,0.12)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF3EA] border border-[#EAE0D4] text-[#C44D27]">
              <SuiteCareBellIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-extrabold uppercase tracking-wider text-[#3D1C11]">
                Need Extra Amenities?
              </p>
              <p className="text-[11px] text-[#7B5F54] truncate">
                Fresh towels, ice buckets, cutlery or turndown care on demand.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToRoomService}
            className="shrink-0 rounded-full bg-[#C44D27] px-4 py-2 text-[11.5px] font-bold text-white shadow-xs hover:bg-[#B2411D] btn-smooth-press cursor-pointer"
          >
            Suite Care
          </button>
        </div>
      )}
    </div>
  );
}
