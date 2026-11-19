import React, { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import {
  verifyStay,
  getGuestMenu,
  placeOrder,
  MenuItem,
  Category,
  ItemModifier,
  PropertySettings,
} from "../lib/api";
import { formatINR } from "../lib/currency";
import { joinStayRoom, onStayInvalidated } from "../lib/socket";
import { DietaryBadge } from "../components/DietaryBadge";
import { Modal } from "../components/Modal";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Receipt,
  ArrowRight,
} from "lucide-react";

interface CartLineItem {
  cartItemId: string;
  item: MenuItem;
  quantity: number;
  selectedModifiers: ItemModifier[];
  notes?: string;
  unitPrice: number;
  lineTotal: number;
}

export function GuestMenu() {
  const [, setLocation] = useLocation();
  const [stayData, setStayData] = useState<any | null>(null);
  const [property, setProperty] = useState<PropertySettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");

  // Cart
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Customizer Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<Record<string, ItemModifier>>({});
  const [customizerNotes, setCustomizerNotes] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("ird_stay_token");
    if (!token) {
      setLocation("/stay");
      return;
    }

    Promise.all([verifyStay(token), getGuestMenu()])
      .then(([stayRes, menuRes]) => {
        setStayData(stayRes.stay);
        setProperty(stayRes.property);
        setCategories(menuRes.categories);
        setItems(menuRes.items);
        setLoading(false);

        // Join Socket Room for this room/stay
        joinStayRoom(stayRes.stay.id);
      })
      .catch((err) => {
        setError(err.message || "Failed to load in-room dining menu.");
        setLoading(false);
      });

    const unsubInvalidated = onStayInvalidated((data) => {
      alert("Notice: " + data.message);
      localStorage.removeItem("ird_stay_token");
      setLocation("/stay");
    });

    return () => {
      unsubInvalidated();
    };
  }, [setLocation]);

  // Open item customizer
  const handleOpenCustomizer = (item: MenuItem) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setCustomizingItem(item);
      // Group defaults
      const initialMods: Record<string, ItemModifier> = {};
      item.modifiers.forEach((m) => {
        if (m.isDefault) {
          initialMods[m.groupName] = m;
        }
      });
      setSelectedMods(initialMods);
      setCustomizerNotes("");
    } else {
      // Add directly
      addToCart(item, [], "");
    }
  };

  const addToCart = (item: MenuItem, modifiers: ItemModifier[], notes: string) => {
    const modTotal = modifiers.reduce((acc, m) => acc + Number(m.priceDelta), 0);
    const unitPrice = Number(item.price) + modTotal;
    const cartItemId = `${item.id}-${modifiers.map((m) => m.id).sort().join("_")}-${notes}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.cartItemId === cartItemId);
      if (existing) {
        return prev.map((c) =>
          c.cartItemId === cartItemId
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * unitPrice }
            : c
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          item,
          quantity: 1,
          selectedModifiers: modifiers,
          notes,
          unitPrice,
          lineTotal: unitPrice,
        },
      ];
    });

    setCustomizingItem(null);
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.cartItemId === cartItemId) {
            const nextQty = line.quantity + delta;
            return nextQty > 0
              ? { ...line, quantity: nextQty, lineTotal: nextQty * line.unitPrice }
              : null;
          }
          return line;
        })
        .filter(Boolean) as CartLineItem[]
    );
  };

  // Calculations
  const subtotal = useMemo(() => cart.reduce((acc, c) => acc + c.lineTotal, 0), [cart]);
  const taxRate = (property?.taxRatePercent || 10) / 100;
  const serviceRate = (property?.serviceChargePercent || 5) / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const serviceCharge = Math.round(subtotal * serviceRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount + serviceCharge) * 100) / 100;
  const totalCartCount = useMemo(() => cart.reduce((acc, c) => acc + c.quantity, 0), [cart]);

  // Submit Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    try {
      const orderPayload = {
        specialInstructions,
        items: cart.map((line) => ({
          menuItemId: line.item.id,
          quantity: line.quantity,
          modifierIds: line.selectedModifiers.map((m) => m.id),
          notes: line.notes,
        })),
      };

      const res = await placeOrder(orderPayload);
      setCart([]);
      setIsCartOpen(false);
      // Navigate to live tracking
      setLocation(`/order/${res.order.id}`);
    } catch (err: any) {
      alert("Could not place order: " + (err.message || "Please try again."));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.categoryId !== selectedCategory) {
        return false;
      }
      // Dietary filter
      if (dietaryFilter !== "all") {
        if (!item.dietaryFlags.map((f) => f.toLowerCase()).includes(dietaryFilter.toLowerCase())) {
          return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        return nameMatch || descMatch;
      }
      return true;
    });
  }, [items, selectedCategory, dietaryFilter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#B88223] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-serif text-sm text-[#73685C]">Preparing the In-Room Dining Menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-[#FFFDF9] border border-red-200 rounded-3xl text-center shadow-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="font-serif text-xl font-bold text-[#1E150F] mb-2">Access Notice</h2>
        <p className="text-sm text-[#73685C] mb-6">{error}</p>
        <Link
          href="/stay"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-[#1E150F] hover:bg-[#29231F]"
        >
          Authenticate Room Access
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Suite Header Banner */}
      <section className="bg-[#1E150F] text-[#FFFDF9] py-8 px-4 sm:px-6 border-b border-[#B88223]/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#B88223]/20 text-[#D5A754] border border-[#B88223]/40 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Active Room Service Session
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Suite {stayData?.room?.roomNumber}{stayData?.room?.wing ? ` · ${stayData.room.wing}` : ""}
            </h1>
            <p className="text-sm text-[#D5C9B8]">
              Welcoming {stayData?.guestName} · Room service ordering hours: {property?.openingTime} – {property?.closingTime}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/stay/orders"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FFFDF9]/10 hover:bg-[#FFFDF9]/20 text-[#FFFDF9] border border-[#FFFDF9]/20 transition-colors flex items-center gap-1.5"
            >
              <Receipt className="w-4 h-4 text-[#B88223]" />
              Active Orders
            </Link>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search & Dietary Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#73685C] absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes, drinks, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#FFFDF9] border border-[#E5DDD1] rounded-xl text-sm text-[#1E150F] placeholder-[#73685C]/60 focus:outline-none focus:ring-2 focus:ring-[#B88223]/30 focus:border-[#B88223]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-[#73685C] hover:text-[#1E150F]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dietary Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: "all", label: "All Items" },
              { id: "veg", label: "🌱 Vegetarian" },
              { id: "vegan", label: "🌿 Vegan" },
              { id: "gluten_free", label: "🌾 Gluten-Free" },
              { id: "chef_special", label: "★ Chef's Special" },
            ].map((diet) => (
              <button
                key={diet.id}
                onClick={() => setDietaryFilter(diet.id)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
                  dietaryFilter === diet.id
                    ? "bg-[#1E150F] text-white shadow-xs"
                    : "bg-[#FFFDF9] text-[#73685C] border border-[#E5DDD1] hover:border-[#B88223]"
                }`}
              >
                {diet.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-[#E5DDD1]">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#B88223] text-white shadow-sm"
                : "bg-[#FFFDF9] text-[#73685C] hover:text-[#1E150F] hover:bg-[#F8F5EF]"
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#B88223] text-white shadow-sm"
                  : "bg-[#FFFDF9] text-[#73685C] hover:text-[#1E150F] hover:bg-[#F8F5EF]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-12 text-center max-w-md mx-auto my-12">
            <span className="text-4xl block mb-3">🔍</span>
            <h3 className="font-serif text-lg font-bold text-[#1E150F] mb-1">No matching dishes</h3>
            <p className="text-xs text-[#73685C] mb-4">
              Try adjusting your search query or dietary filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setDietaryFilter("all");
                setSelectedCategory("all");
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8F5EF] text-[#1E150F] hover:bg-[#EAE2D5]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Photo with aspect ratio */}
                  {item.imageUrl ? (
                    <div className="relative aspect-16/10 bg-[#EAE2D5] overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                        {item.dietaryFlags.map((flag) => (
                          <DietaryBadge key={flag} tag={flag} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-16/10 bg-[#F8F5EF] flex items-center justify-center text-3xl">
                      🍽️
                    </div>
                  )}

                  {/* Details */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-serif text-lg font-bold text-[#1E150F] leading-tight">
                        {item.name}
                      </h3>
                      <span className="font-mono text-base font-bold text-[#1E150F] shrink-0">
                        {formatINR(item.price)}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-[#73685C] leading-relaxed line-clamp-3 mb-3">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-[#73685C]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#B88223]" />
                        ~{item.prepTimeMinutes} mins
                      </span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <span className="text-[#825C15] font-medium">Customizable</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Add Action */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => handleOpenCustomizer(item)}
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    {item.modifiers && item.modifiers.length > 0 ? "Customize & Add" : "Add to Order"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-30 px-4 flex justify-center">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-md bg-[#1E150F] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-[#B88223]/50 hover:bg-[#29231F] transition-all cursor-pointer animate-in slide-in-from-bottom-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B88223] text-white flex items-center justify-center font-bold text-sm">
                {totalCartCount}
              </div>
              <div className="text-left">
                <span className="block text-xs uppercase tracking-wider text-[#D5C9B8] font-semibold">
                  Suite {stayData?.room?.roomNumber} Cart
                </span>
                <span className="font-serif text-sm font-bold">Review Order</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold">{formatINR(subtotal)}</span>
              <ArrowRight className="w-5 h-5 text-[#B88223]" />
            </div>
          </button>
        </div>
      )}

      {/* Item Customizer Modal */}
      <Modal
        isOpen={Boolean(customizingItem)}
        onClose={() => setCustomizingItem(null)}
        title={customizingItem ? `Customize: ${customizingItem.name}` : ""}
      >
        {customizingItem && (
          <div className="space-y-6">
            <p className="text-xs text-[#73685C] leading-relaxed">
              {customizingItem.description}
            </p>

            {/* Modifiers grouped by groupName */}
            {(() => {
              const groups: Record<string, ItemModifier[]> = {};
              customizingItem.modifiers.forEach((m) => {
                if (!groups[m.groupName]) groups[m.groupName] = [];
                groups[m.groupName].push(m);
              });

              return Object.entries(groups).map(([groupName, mods]) => (
                <div key={groupName} className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F]">
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
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                            isSelected
                              ? "bg-[#B88223]/10 border-[#B88223] text-[#1E150F]"
                              : "bg-[#F8F5EF] border-[#E5DDD1] text-[#73685C] hover:border-[#B88223]/50"
                          }`}
                        >
                          <span className="font-semibold">{mod.name}</span>
                          <span className="font-mono text-[#825C15]">
                            {mod.priceDelta > 0 ? `+${formatINR(mod.priceDelta)}` : "Included"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {/* Preparation Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Special Preparation Requests
              </label>
              <input
                type="text"
                placeholder="e.g. Dressing on side, no chives..."
                value={customizerNotes}
                onChange={(e) => setCustomizerNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
            </div>

            {/* Add to order button */}
            <div className="pt-4 border-t border-[#E5DDD1] flex items-center justify-between">
              <div>
                <span className="block text-[11px] text-[#73685C]">Calculated Item Price</span>
                <span className="font-mono text-lg font-bold text-[#1E150F]">
                  {formatINR(
                    Number(customizingItem.price) +
                    Object.values(selectedMods).reduce((acc, m) => acc + Number(m.priceDelta), 0)
                  )}
                </span>
              </div>
              <button
                onClick={() =>
                  addToCart(customizingItem, Object.values(selectedMods), customizerNotes)
                }
                className="px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-all cursor-pointer shadow-md"
              >
                Add to Cart
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cart & Order Checkout Modal */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title={`In-Room Dining Cart · Suite ${stayData?.room?.roomNumber}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          {/* Cart Line Items */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {cart.map((line) => (
              <div
                key={line.cartItemId}
                className="p-3.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-serif text-sm font-bold text-[#1E150F] truncate">
                      {line.item.name}
                    </h4>
                    <span className="font-mono text-xs font-bold text-[#1E150F] ml-2">
                      {formatINR(line.lineTotal)}
                    </span>
                  </div>
                  {line.selectedModifiers.length > 0 && (
                    <p className="text-[11px] text-[#73685C] truncate">
                      {line.selectedModifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {line.notes && (
                    <p className="text-[11px] text-[#825C15] italic truncate">Note: {line.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateCartQuantity(line.cartItemId, -1)}
                    className="w-7 h-7 rounded-lg bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] hover:bg-[#EAE2D5] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-xs font-bold w-4 text-center">
                    {line.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(line.cartItemId, 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-[#E5DDD1] flex items-center justify-center text-[#1E150F] hover:bg-[#EAE2D5] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Special Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Room Delivery Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Please knock gently, leave on balcony dining table, extra cloth napkins..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          {/* Transparent Bill Breakdown */}
          <div className="p-4 bg-[#F8F5EF] border border-[#E5DDD1] rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-[#73685C]">
              <span>Culinary Subtotal</span>
              <span className="font-mono">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#73685C]">
              <span>Resort Tax ({property?.taxRatePercent || 10}%)</span>
              <span className="font-mono">{formatINR(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-[#73685C]">
              <span>In-Room Service Charge ({property?.serviceChargePercent || 5}%)</span>
              <span className="font-mono">{formatINR(serviceCharge)}</span>
            </div>
            <div className="pt-2 border-t border-[#E5DDD1] flex justify-between font-bold text-sm text-[#1E150F]">
              <span>Total Posted to Room Folio</span>
              <span className="font-mono text-base text-[#1E150F]">{formatINR(totalAmount)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(false)}
              className="flex-1 py-3 rounded-xl font-medium text-xs text-[#73685C] bg-[#F8F5EF] hover:bg-[#EAE2D5] cursor-pointer"
            >
              Add More Items
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmittingOrder || cart.length === 0}
              className="flex-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmittingOrder ? (
                "Transmitting to Kitchen..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#B88223]" />
                  Place Order to Suite {stayData?.room?.roomNumber}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
