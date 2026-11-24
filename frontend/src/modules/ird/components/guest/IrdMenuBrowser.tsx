import React, { useMemo, useState } from "react";
import { Clock, Minus, Plus, Search, X } from "lucide-react";
import { cn } from "../../../../core/ui/utils";
import { ArchClocheIcon } from "../../../../core/ui/EnterpriseIcons";
import { useIrdAdapter } from "../../adapter";
import { DietaryBadge } from "../DietaryBadge";
import { IrdHeroBanner } from "./IrdHeroBanner";
import type { CartLineItem, Category, IrdPropertyConfig, MenuItem } from "../../types";

interface IrdMenuBrowserProps {
  categories: Category[];
  items: MenuItem[];
  menuLoading: boolean;
  property?: IrdPropertyConfig | null;
  cart: CartLineItem[];
  onOpenItemDetails: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  onUpdateCartQuantity: (cartItemId: string, delta: number) => void;
}

export function IrdMenuBrowser({
  categories,
  items,
  menuLoading,
  property,
  cart,
  onOpenItemDetails,
  onQuickAdd,
  onUpdateCartQuantity,
}: IrdMenuBrowserProps) {
  const { formatPrice } = useIrdAdapter();
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
    return [{ id: category?.id ?? "search-results", title: category?.name ?? "", items: filteredItems }];
  }, [categories, filteredItems, searchQuery, selectedCategory]);

  const chefsPicks = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.available &&
            item.dietaryFlags?.some((flag) =>
              ["chef_special", "signature"].includes(flag.toLowerCase())
            )
        )
        .slice(0, 3),
    [items]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <IrdHeroBanner property={property} />

      {/* Search & Controls Bar */}
      <div className="space-y-3" id="ird-menu-items">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#847C73]"
              strokeWidth={1.5}
            />
            <input
              id="ird-menu-search"
              type="text"
              placeholder="Search dishes, coffees, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-[rgba(20,18,16,0.12)] bg-white pl-10 pr-9 text-xs text-[#141210] placeholder:text-[#847C73] focus:border-[#141210] focus:outline-none sm:text-[13px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#847C73] hover:text-[#141210]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "All" },
                { id: "veg", label: "Veg" },
                { id: "non_veg", label: "Non-Veg" },
                { id: "chef_special", label: "Signature" },
              ].map((diet) => (
                <button
                  key={diet.id}
                  type="button"
                  onClick={() => setDietaryFilter(diet.id)}
                  className={cn(
                    "whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors btn-smooth-press-sm",
                    dietaryFilter === diet.id
                      ? "border-[#141210] bg-[#141210] text-white"
                      : "border-[rgba(20,18,16,0.12)] bg-white text-[#5C554E] hover:border-[rgba(20,18,16,0.28)]"
                  )}
                >
                  {diet.label}
                </button>
              ))}
            </div>

            <select
              aria-label="Sort menu items"
              value={menuSort}
              onChange={(e) => setMenuSort(e.target.value)}
              className="h-8 rounded-lg border border-[rgba(20,18,16,0.12)] bg-white px-2.5 text-xs text-[#141210] focus:border-[#141210] focus:outline-none"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
              <option value="quickest">Quickest prep</option>
            </select>
          </div>
        </div>

        {/* Architectural Category Rail */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-[rgba(20,18,16,0.09)] pb-2.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors btn-smooth-press-sm",
              selectedCategory === "all"
                ? "border-[#141210] bg-[#141210] text-white"
                : "border-[rgba(20,18,16,0.1)] bg-white text-[#5C554E] hover:border-[rgba(20,18,16,0.26)] hover:text-[#141210]"
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors btn-smooth-press-sm",
                selectedCategory === cat.id
                  ? "border-[#141210] bg-[#141210] text-white"
                  : "border-[rgba(20,18,16,0.1)] bg-white text-[#5C554E] hover:border-[rgba(20,18,16,0.26)] hover:text-[#141210]"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chef's Signature Selection */}
      {dietaryFilter === "all" && selectedCategory === "all" && !searchQuery && chefsPicks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.01em] text-[#141210]">
              Chef’s Selection
            </h2>
            <span className="text-xs text-[#847C73]">House signatures</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {chefsPicks.map((item) => {
              const minPrice =
                item.variants && item.variants.length > 0
                  ? Math.min(...item.variants.map((v) => Number(v.price)))
                  : Number(item.price);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenItemDetails(item)}
                  className="group overflow-hidden rounded-xl border border-[rgba(20,18,16,0.1)] bg-white text-left enterprise-surface-interactive"
                >
                  {item.imageUrl && (
                    <div className="aspect-[16/10] w-full overflow-hidden bg-[#EFECE5]">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <span className="block space-y-1.5 border-t border-[rgba(20,18,16,0.08)] p-4">
                    <strong className="block font-serif text-lg font-semibold leading-snug text-[#141210]">
                      {item.name}
                    </strong>
                    {item.description && (
                      <span className="line-clamp-2 block text-xs leading-relaxed text-[#5C554E]">
                        {item.description}
                      </span>
                    )}
                    <span className="block pt-1 text-xs font-semibold text-[#141210] tabular-nums">
                      {item.variants && item.variants.length > 0 ? (
                        <span>
                          <span className="mr-1 font-normal text-[#847C73]">From</span>
                          {formatPrice(minPrice)}
                        </span>
                      ) : (
                        formatPrice(item.price)
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Dish Cards List */}
      {menuLoading ? (
        <div className="py-12 text-center text-xs text-[#5C554E]">
          <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-[#141210] border-t-transparent" />
          Loading culinary menu...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="my-6 rounded-xl border border-[rgba(20,18,16,0.1)] bg-white p-10 text-center">
          <ArchClocheIcon className="mx-auto mb-3 h-7 w-7 text-[#847C73]" strokeWidth={1.3} />
          <h3 className="font-serif text-lg font-semibold text-[#141210]">No matching dishes</h3>
          <p className="mt-1 text-xs text-[#5C554E]">
            Try clearing your search or switching dietary filters.
          </p>
        </div>
      ) : (
        <div className="space-y-8 pt-1">
          {itemSections.map((section) => (
            <section key={section.id} className="space-y-3.5">
              {section.title && (
                <div className="flex items-baseline justify-between border-b border-[rgba(20,18,16,0.09)] pb-2">
                  <h2 className="font-serif text-2xl font-semibold tracking-[-0.01em] text-[#141210]">
                    {section.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof section.id === "number") setSelectedCategory(section.id);
                    }}
                    className="text-xs font-medium text-[#5C554E] transition-colors hover:text-[#141210] tabular-nums"
                  >
                    {section.items.length} {section.items.length === 1 ? "dish" : "dishes"}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {section.items.map((item) => {
                  const qtyInCart = getItemCartQuantity(item.id);
                  const isAvailable = item.available;
                  const hasVariants = Boolean(item.variants && item.variants.length > 0);
                  const minPrice = hasVariants
                    ? Math.min(...item.variants!.map((v) => Number(v.price)))
                    : Number(item.price);

                  return (
                    <div
                      key={item.id}
                      onClick={() => onOpenItemDetails(item)}
                      className={cn(
                        "flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-white enterprise-surface-interactive card-smooth-press",
                        !isAvailable
                          ? "cursor-not-allowed border-stone-300 bg-stone-50 opacity-60"
                          : "border-[rgba(20,18,16,0.1)]"
                      )}
                    >
                      <div>
                        {item.imageUrl && (
                          <div className="relative aspect-[1.2/1] overflow-hidden bg-[#EFECE5]">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className={cn(
                                "h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]",
                                !isAvailable && "grayscale"
                              )}
                              loading="lazy"
                            />
                            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                              {item.dietaryFlags.map((f) => (
                                <DietaryBadge key={f} tag={f} />
                              ))}
                            </div>
                            {!isAvailable && (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#141210]/65 backdrop-blur-2xs">
                                <span className="rounded-md border border-white/20 bg-[#141210] px-2.5 py-1 text-[11px] font-medium text-white">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-3 sm:p-4">
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-serif text-[16px] font-semibold leading-snug text-[#141210] break-words sm:text-[18px]">
                                {item.name}
                              </h3>
                              {item.dietaryFlags?.length > 0 && !item.imageUrl && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.dietaryFlags.map((f) => (
                                    <DietaryBadge key={f} tag={f} />
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 text-right font-sans text-xs font-semibold text-[#141210] tabular-nums sm:text-sm">
                              {hasVariants ? (
                                <span className="flex flex-col items-end">
                                  <span className="text-[10px] font-normal text-[#847C73] leading-none">
                                    From
                                  </span>
                                  <span>{formatPrice(minPrice)}</span>
                                </span>
                              ) : (
                                formatPrice(item.price)
                              )}
                            </span>
                          </div>

                          {item.description && (
                            <p className="mb-1.5 line-clamp-2 break-words text-[11px] leading-relaxed text-[#5C554E] sm:text-xs">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
                        <div className="flex items-center justify-between gap-1 border-t border-[rgba(20,18,16,0.07)] pt-2.5">
                          <span className="flex items-center gap-1 text-[10px] text-[#847C73] tabular-nums">
                            <Clock className="h-3 w-3 text-[#966F29]" strokeWidth={1.5} />
                            {item.prepTimeMinutes} min
                          </span>

                          <div onClick={(e) => e.stopPropagation()}>
                            {!isAvailable ? (
                              <button
                                disabled
                                className="cursor-not-allowed rounded-lg bg-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-500"
                              >
                                Unavailable
                              </button>
                            ) : hasVariants || (item.modifiers && item.modifiers.length > 0) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenItemDetails(item);
                                }}
                                className="flex h-8 items-center gap-1.5 rounded-lg bg-[#141210] px-3 text-xs font-medium text-white transition-colors hover:bg-[#2B2622] btn-smooth-press-sm"
                              >
                                <Plus className="h-3.5 w-3.5" strokeWidth={1.6} />
                                <span>{hasVariants ? "Options" : "Select"}</span>
                                {qtyInCart > 0 && (
                                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-sm bg-[#966F29] px-1 text-[10px] font-semibold text-white tabular-nums">
                                    {qtyInCart}
                                  </span>
                                )}
                              </button>
                            ) : qtyInCart > 0 ? (
                              <div className="flex items-center gap-1 rounded-lg border border-[rgba(20,18,16,0.14)] bg-[#F6F4EF] p-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const match = cart.find((c) => c.item.id === item.id);
                                    if (match) onUpdateCartQuantity(match.cartItemId, -1);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#141210] transition-transform active:scale-95"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" strokeWidth={1.6} />
                                </button>
                                <span className="w-5 text-center text-xs font-semibold tabular-nums">
                                  {qtyInCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickAdd(item);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#141210] transition-transform active:scale-95"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" strokeWidth={1.6} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickAdd(item);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141210] text-white transition-colors hover:bg-[#2B2622] btn-smooth-press-sm"
                                title="Add to order"
                              >
                                <Plus className="h-4 w-4" strokeWidth={1.6} />
                                <span className="sr-only">Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
