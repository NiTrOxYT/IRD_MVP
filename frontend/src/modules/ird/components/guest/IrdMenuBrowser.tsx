import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, Clock, Coffee, Croissant, Minus, Plus, Search, Utensils, X } from "lucide-react";
import { HeritageCrestIcon } from "../../../../core/ui/CustomResortIcons";
import { setupScrollBatchCards, useGSAP } from "../../../../core/ui/gsap";
import { cn } from "../../../../core/ui/utils";
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
        .slice(0, 4),
    [items]
  );

  useGSAP(
    () => {
      const el = browserRef.current;
      if (!el || menuLoading || items.length === 0) return;
      setupScrollBatchCards(el, ".gsap-menu-card", { stagger: 0.04, y: 12, start: "top 95%" });
    },
    {
      scope: browserRef,
      dependencies: [menuLoading, selectedCategory],
      revertOnUpdate: true,
    }
  );

  return (
    <div ref={browserRef} className="mx-auto max-w-md space-y-5 sm:max-w-2xl sm:space-y-6 lg:max-w-4xl">
      <IrdHeroBanner property={property} />

      {/* Sticky Frosted Search & Dietary Filter Bar */}
      <div
        id="ird-menu-items"
        className="sticky top-[57px] z-20 rounded-[26px] frost-component-card px-3.5 py-3 space-y-2.5"
      >
        <div className="relative">
          <Search className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="ird-menu-search"
            type="text"
            placeholder="Search dishes, coffee, desserts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-white/18 bg-black/28 py-2.5 pl-10 pr-9 text-xs text-white placeholder:text-white/55 focus:border-white/40 focus:outline-none sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/75 hover:bg-white/15 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors duration-150 btn-smooth-press-sm",
                  dietaryFilter === diet.id ? "frost-cta-white" : "frost-pill-chip text-white/85"
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
              className="appearance-none rounded-full border border-white/18 bg-black/32 py-1.5 pl-3 pr-7 text-[11px] font-semibold text-white focus:border-white/40 focus:outline-none"
            >
              <option value="recommended" className="bg-[#23241C] text-white">Recommended</option>
              <option value="price_low" className="bg-[#23241C] text-white">Price: Low–High</option>
              <option value="price_high" className="bg-[#23241C] text-white">Price: High–Low</option>
              <option value="quickest" className="bg-[#23241C] text-white">Fastest Prep</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/75" />
          </div>
        </div>
      </div>

      {/* Category Pill Strip */}
      <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors btn-smooth-press-sm",
            selectedCategory === "all" ? "frost-cta-white" : "frost-pill-chip text-white/85"
          )}
        >
          <Utensils className="h-3.5 w-3.5" />
          <span>All</span>
        </button>

        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
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
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors btn-smooth-press-sm",
                active ? "frost-cta-white" : "frost-pill-chip text-white/85"
              )}
            >
              {isDessert ? (
                <Croissant className="h-3.5 w-3.5" />
              ) : isDrink ? (
                <Coffee className="h-3.5 w-3.5" />
              ) : (
                <Utensils className="h-3.5 w-3.5" />
              )}
              <span className="whitespace-nowrap">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Chef's Bestsellers Frosted Cards */}
      {dietaryFilter === "all" && selectedCategory === "all" && !searchQuery && chefsPicks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-sans text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <HeritageCrestIcon className="w-4 h-4 text-white/90" />
              Chef’s Bestsellers
            </h2>
            <span className="text-[11px] font-semibold text-white/70">Top Rated</span>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
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
                  className="gsap-menu-card group w-[228px] shrink-0 snap-start overflow-hidden rounded-[28px] frost-component-card text-left sm:w-auto cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {item.imageUrl && (
                      <div className="relative h-[136px] w-full overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="pointer-events-none absolute inset-0 frost-component-fade" />
                        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-white" />
                          <span className="h-1 w-1 rounded-full bg-white/40" />
                          <span className="h-1 w-1 rounded-full bg-white/40" />
                        </div>
                      </div>
                    )}
                    <div className="px-4 pb-3 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="font-sans text-sm font-bold text-white line-clamp-1">
                          {item.name}
                        </strong>
                        <span className="shrink-0 rounded-full frost-pill-chip px-2 py-0.5 text-[10px] font-bold tabular-nums">
                          {item.variants && item.variants.length > 0
                            ? formatPrice(minPrice)
                            : formatPrice(item.price)}
                        </span>
                      </div>
                      <span className="mt-1.5 inline-block rounded-full frost-pill-chip px-2.5 py-0.5 text-[10px] font-semibold">
                        Bestseller
                      </span>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <span className="flex w-full items-center justify-center rounded-full frost-cta-white py-2 text-[11px] font-bold">
                      Order Dish
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Dish Cards — Reference 2 Seamless Photo-to-Frosted Card Architecture */}
      {menuLoading ? (
        <div className="frost-component-card rounded-[30px] py-12 text-center text-xs text-white/75">
          <div className="w-7 h-7 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto mb-2.5" />
          Loading freshly plated culinary menu...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="frost-component-card rounded-[30px] p-8 text-center my-6">
          <Utensils className="w-8 h-8 text-white/75 mx-auto mb-2.5" />
          <h3 className="font-sans text-base font-bold text-white">No items match your filter</h3>
          <p className="text-xs text-white/70 mt-1">
            Try adjusting your search query or dietary preferences.
          </p>
        </div>
      ) : (
        <div className="space-y-8 pt-1">
          {itemSections.map((section) => (
            <section key={section.id} className="space-y-3.5">
              {section.title && (
                <div className="flex items-baseline justify-between border-b border-white/15 pb-2 px-1">
                  <h2 className="font-sans text-lg font-bold tracking-tight text-white sm:text-xl">
                    {section.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof section.id === "number") setSelectedCategory(section.id);
                    }}
                    className="text-xs font-semibold text-white/70 hover:text-white tabular-nums"
                  >
                    {section.items.length} {section.items.length === 1 ? "dish" : "dishes"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        "gsap-menu-card group relative flex flex-col justify-between overflow-hidden rounded-[30px] frost-component-card",
                        !isAvailable ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      )}
                    >
                      <div>
                        {/* Seamless Photo-to-Frosted Card Top when photo exists */}
                        {item.imageUrl && (
                          <div className="relative h-[168px] w-full overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              className={cn(
                                "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                                !isAvailable && "grayscale"
                              )}
                            />
                            <div className="pointer-events-none absolute inset-0 frost-component-fade" />
                            <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                              <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                            </div>
                          </div>
                        )}

                        <div className={cn("px-5 pb-3.5 space-y-2.5", item.imageUrl ? "-mt-1" : "pt-5")}>
                          {/* Title Left + Frosted Price Pill Right (Reference 2 layout) */}
                          <div className="flex items-start justify-between gap-2.5">
                            <h3 className="font-sans text-[17px] sm:text-[18px] font-bold leading-snug text-white">
                              {item.name}
                            </h3>
                            <span className="shrink-0 rounded-full frost-pill-chip px-3 py-1 text-xs font-bold text-white tabular-nums">
                              {hasVariants ? `From ${formatPrice(minPrice)}` : formatPrice(item.price)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="line-clamp-2 text-[12px] leading-relaxed text-white/75">
                              {item.description}
                            </p>
                          )}

                          {/* Frosted Meta Badges Row */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full frost-pill-chip px-2.5 py-0.5 text-[10.5px] font-semibold tabular-nums">
                              <Clock className="h-3 w-3 text-white/80" />
                              {item.prepTimeMinutes}m prep
                            </span>
                            {item.dietaryFlags?.map((f) => (
                              <DietaryBadge key={f} tag={f} variant="glass" />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Signature White Pill CTA / Stepper */}
                      <div
                        className="px-5 pb-5 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isAvailable ? (
                          <div className="w-full rounded-full frost-pill-chip py-2.5 text-center text-xs font-semibold text-white/70">
                            Sold Out
                          </div>
                        ) : isCustomizable ? (
                          <button
                            type="button"
                            onClick={() => onOpenItemDetails(item)}
                            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full frost-cta-white text-xs font-bold btn-smooth-press cursor-pointer"
                          >
                            <span>{qtyInCart > 0 ? "Customize / Add" : "Select Options"}</span>
                            <Plus className="h-3.5 w-3.5" />
                            {qtyInCart > 0 && (
                              <span
                                key={qtyInCart}
                                className="ml-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#171714] px-1.5 text-[10px] font-bold text-white tabular-nums zomato-qty-pop"
                              >
                                {qtyInCart}
                              </span>
                            )}
                          </button>
                        ) : qtyInCart > 0 ? (
                          <div className="flex h-10 w-full items-center justify-between rounded-full frost-cta-white px-2 zomato-stepper-in">
                            <button
                              type="button"
                              onClick={() => {
                                const match = cart.find((c) => c.item.id === item.id);
                                if (match) onUpdateCartQuantity(match.cartItemId, -1);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition-transform cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span
                              key={qtyInCart}
                              className="text-xs font-extrabold tabular-nums zomato-qty-pop"
                            >
                              {qtyInCart} in Tray
                            </span>
                            <button
                              type="button"
                              onClick={() => onQuickAdd(item)}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition-transform cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onQuickAdd(item)}
                            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full frost-cta-white text-xs font-bold btn-smooth-press cursor-pointer"
                          >
                            <span>Add to Tray</span>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
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
  );
}
