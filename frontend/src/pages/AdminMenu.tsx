import React, { useState, useEffect, useCallback } from "react";
import {
  getAdminMenu,
  toggleItemAvailability,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  reorderCategories,
  deleteCategory,
  Category,
  MenuItem,
  MenuItemVariant,
} from "../lib/api";
import { formatINR } from "../lib/currency";
import { Modal } from "../components/Modal";
import { DietaryBadge } from "../components/DietaryBadge";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RotateCcw,
  Edit3,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  FolderPlus,
  Layers,
  Flame,
  ChefHat,
  Search,
  Check,
} from "lucide-react";
import { cn } from "../lib/utils";

export function AdminMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search and filter for items
  const [itemSearch, setItemSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");

  // ── Item Modal State (Create / Edit) ──
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState<number | "">("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemPrepTime, setItemPrepTime] = useState("20");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemDietaryFlags, setItemDietaryFlags] = useState<string[]>([]);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Pricing type: "standard" vs "variants"
  const [pricingType, setPricingType] = useState<"standard" | "variants">("standard");
  const [standardPrice, setStandardPrice] = useState("");
  const [itemVariants, setItemVariants] = useState<Array<{
    id?: number;
    name: string;
    price: number | string;
    available: boolean;
    sortOrder: number;
  }>>([
    { name: "Regular", price: "", available: true, sortOrder: 1 },
    { name: "Large", price: "", available: true, sortOrder: 2 },
  ]);

  // ── Category Modal State (Create / Edit) ──
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catIsActive, setCatIsActive] = useState(true);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // ── Safe Category Deletion Modal ──
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<number | "">("");
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchMenu = useCallback(async () => {
    try {
      const res = await getAdminMenu();
      setCategories(res.categories);
      setItems(res.items);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      showFeedback("error", "Failed to load menu: " + (err.message || "Unknown error"));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // ─────────────────────────────────────────────
  // ── CATEGORY MANAGEMENT HANDLERS ───────────────
  // ─────────────────────────────────────────────

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatDescription("");
    setCatIsActive(true);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || "");
    setCatIsActive(cat.is_active !== false);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showFeedback("error", "Category name is required.");
      return;
    }

    setIsSubmittingCategory(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: catName.trim(),
          description: catDescription.trim() || undefined,
          isActive: catIsActive,
        });
        showFeedback("success", `Category "${catName}" updated successfully.`);
      } else {
        const nextSortOrder = categories.length + 1;
        await createCategory({
          name: catName.trim(),
          description: catDescription.trim() || undefined,
          sortOrder: nextSortOrder,
          isActive: catIsActive,
        });
        showFeedback("success", `Category "${catName}" created successfully.`);
      }

      setIsCategoryModalOpen(false);
      await fetchMenu();
    } catch (err: any) {
      showFeedback("error", "Failed to save category: " + err.message);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleToggleCategoryStatus = async (cat: Category) => {
    const nextStatus = !(cat.is_active !== false);
    try {
      await toggleCategoryStatus(cat.id, nextStatus);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextStatus } : c))
      );
      showFeedback("success", `Category "${cat.name}" is now ${nextStatus ? "active" : "disabled"}.`);
    } catch (err: any) {
      showFeedback("error", "Status toggle failed: " + err.message);
    }
  };

  const handleMoveCategory = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    // Build reorder payload
    const orders = newCategories.map((c, idx) => ({ id: c.id, sortOrder: idx + 1 }));

    // Optimistic UI update
    setCategories(newCategories.map((c, idx) => ({ ...c, sort_order: idx + 1 })));

    try {
      await reorderCategories(orders);
      showFeedback("success", "Category order updated.");
    } catch (err: any) {
      showFeedback("error", "Failed to reorder categories: " + err.message);
      await fetchMenu();
    }
  };

  const handleRequestDeleteCategory = (cat: Category) => {
    const count = Number(cat.item_count || 0);
    if (count > 0) {
      setDeletingCategory(cat);
      // Pick first other category as default reassign target
      const otherCat = categories.find((c) => c.id !== cat.id);
      setReassignTargetId(otherCat ? otherCat.id : "");
    } else {
      if (window.confirm(`Delete empty category "${cat.name}"?`)) {
        executeDeleteCategory(cat.id);
      }
    }
  };

  const executeDeleteCategory = async (catId: number, targetId?: number) => {
    setIsDeletingCategory(true);
    try {
      await deleteCategory(catId, targetId);
      showFeedback("success", "Category deleted successfully.");
      setDeletingCategory(null);
      await fetchMenu();
    } catch (err: any) {
      showFeedback("error", "Deletion failed: " + err.message);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // ─────────────────────────────────────────────
  // ── ITEM MANAGEMENT HANDLERS ─────────────────
  // ─────────────────────────────────────────────

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemCategoryId(categories.length > 0 ? categories[0].id : "");
    setItemDescription("");
    setItemImageUrl("");
    setItemPrepTime("20");
    setItemAvailable(true);
    setItemDietaryFlags([]);
    setPricingType("standard");
    setStandardPrice("");
    setItemVariants([
      { name: "Regular", price: "", available: true, sortOrder: 1 },
      { name: "Large", price: "", available: true, sortOrder: 2 },
    ]);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategoryId(item.categoryId);
    setItemDescription(item.description || "");
    setItemImageUrl(item.imageUrl || "");
    setItemPrepTime(String(item.prepTimeMinutes || 20));
    setItemAvailable(item.available);
    setItemDietaryFlags(item.dietaryFlags || []);

    if (item.variants && item.variants.length > 0) {
      setPricingType("variants");
      setStandardPrice(String(item.price || ""));
      setItemVariants(
        item.variants.map((v, idx) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          available: v.available,
          sortOrder: v.sortOrder || idx + 1,
        }))
      );
    } else {
      setPricingType("standard");
      setStandardPrice(String(item.price));
      setItemVariants([
        { name: "Regular", price: item.price, available: true, sortOrder: 1 },
        { name: "Large", price: "", available: true, sortOrder: 2 },
      ]);
    }

    setIsItemModalOpen(true);
  };

  const handleToggleItemStatus = async (item: MenuItem) => {
    const nextVal = !item.available;
    try {
      await toggleItemAvailability(item.id, nextVal);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: nextVal } : i))
      );
      showFeedback("success", `"${item.name}" is now ${nextVal ? "live" : "86'd / offline"}.`);
    } catch (err: any) {
      showFeedback("error", "Toggle failed: " + err.message);
    }
  };

  const handleDeleteItem = async (itemId: number, dishName: string) => {
    if (!window.confirm(`Permanently remove "${dishName}" from the menu catalog?`)) return;
    try {
      await deleteMenuItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      showFeedback("success", `"${dishName}" deleted.`);
    } catch (err: any) {
      showFeedback("error", "Failed to delete: " + err.message);
    }
  };

  const handleAddVariantRow = () => {
    setItemVariants((prev) => [
      ...prev,
      {
        name: "",
        price: "",
        available: true,
        sortOrder: prev.length + 1,
      },
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setItemVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateVariantRow = (index: number, field: string, val: any) => {
    setItemVariants((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, [field]: val } : v))
    );
  };

  const toggleDietaryFlag = (flag: string) => {
    setItemDietaryFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCategoryId) {
      showFeedback("error", "Dish name and category are required.");
      return;
    }

    let finalPrice = 0;
    let finalVariants: Array<{
      id?: number;
      name: string;
      price: number;
      available: boolean;
      sortOrder: number;
    }> = [];

    if (pricingType === "standard") {
      finalPrice = Number(standardPrice);
      if (isNaN(finalPrice) || finalPrice < 0 || standardPrice === "") {
        showFeedback("error", "Please provide a valid price.");
        return;
      }
    } else {
      // Validate variants
      if (itemVariants.length === 0) {
        showFeedback("error", "Please add at least one portion / size variant.");
        return;
      }
      for (const v of itemVariants) {
        if (!v.name.trim() || v.price === "" || isNaN(Number(v.price)) || Number(v.price) < 0) {
          showFeedback("error", "Each variant must have a valid name and price.");
          return;
        }
      }
      finalVariants = itemVariants.map((v, idx) => ({
        id: v.id,
        name: v.name.trim(),
        price: Number(v.price),
        available: v.available,
        sortOrder: idx + 1,
      }));
      // Set base price to lowest available variant
      finalPrice = Math.min(...finalVariants.map((v) => v.price));
    }

    setIsSubmittingItem(true);
    try {
      const payload: Partial<MenuItem> = {
        name: itemName.trim(),
        categoryId: Number(itemCategoryId),
        price: finalPrice,
        description: itemDescription.trim() || undefined,
        imageUrl: itemImageUrl.trim() || undefined,
        prepTimeMinutes: Number(itemPrepTime) || 20,
        available: itemAvailable,
        dietaryFlags: itemDietaryFlags,
        variants: pricingType === "variants" ? finalVariants : [],
      };

      if (editingItem) {
        await updateMenuItem(editingItem.id, payload);
        showFeedback("success", `Dish "${itemName}" updated successfully.`);
      } else {
        await createMenuItem(payload);
        showFeedback("success", `Dish "${itemName}" added to menu.`);
      }

      setIsItemModalOpen(false);
      await fetchMenu();
    } catch (err: any) {
      showFeedback("error", "Failed to save item: " + err.message);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Filtered Items
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && item.categoryId !== categoryFilter) return false;
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      return matchName || matchDesc;
    }
    return true;
  });

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5DDD1]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314]">
            Culinary Management · In-Room Dining
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1E150F] tracking-tight mt-0.5">
            Menu Catalog & Categories
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Configure dishes, portions, sizes, prices in Indian Rupees (₹), and category organization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => void fetchMenu()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#E5DDD1] text-[#1E150F] hover:bg-[#FAF8F5] shadow-2xs btn-smooth-press cursor-pointer"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAddCategory}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-[#FFFDF9] hover:bg-[#FAF8F5] text-[#1E150F] border border-[#E5DDD1] rounded-xl text-xs font-semibold shadow-2xs btn-smooth-press cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-[#8E6314]" />
            <span>New Category</span>
          </button>

          <button
            onClick={handleOpenAddItem}
            className="inline-flex items-center gap-2 py-2 px-4 bg-[#1E150F] hover:bg-[#29231F] text-white rounded-xl text-xs font-bold shadow-md btn-smooth-press cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#B88223]" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* ── Feedback Notification ── */}
      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 shadow-2xs",
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-[#E5DDD1] pb-1">
        <button
          onClick={() => setActiveTab("items")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
            activeTab === "items"
              ? "bg-[#1E150F] text-white shadow-xs"
              : "text-[#73685C] hover:text-[#1E150F] hover:bg-[#FFFDF9]"
          )}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Menu Dishes ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
            activeTab === "categories"
              ? "bg-[#1E150F] text-white shadow-xs"
              : "text-[#73685C] hover:text-[#1E150F] hover:bg-[#FFFDF9]"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Category Management ({categories.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#73685C]">
          <div className="w-8 h-8 rounded-full border-3 border-[#B88223] border-t-transparent animate-spin mx-auto mb-3" />
          <span>Loading menu catalog...</span>
        </div>
      ) : activeTab === "items" ? (
        /* ──────────────── TAB 1: MENU DISHES ──────────────── */
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FFFDF9] p-3 rounded-2xl border border-[#E5DDD1] shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#73685C] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dishes or ingredients..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-1 focus:ring-[#B88223]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-[#73685C] shrink-0 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-1 focus:ring-[#B88223] w-full sm:w-auto"
              >
                <option value="all">All Categories ({items.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-8 text-center my-6">
              <span className="text-3xl block mb-2">🍽️</span>
              <h3 className="font-serif text-base font-bold text-[#1E150F]">No dishes match your filter</h3>
              <p className="text-xs text-[#73685C] mt-1">Try resetting the search or category selection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const category = categories.find((c) => c.id === item.categoryId);
                const hasVariants = Boolean(item.variants && item.variants.length > 0);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "bg-[#FFFDF9] border rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all card-smooth-press",
                      item.available ? "border-[#E5DDD1]" : "border-stone-300 bg-stone-50/70 opacity-75"
                    )}
                  >
                    <div>
                      {item.imageUrl && (
                        <div className="relative aspect-16/10 rounded-2xl overflow-hidden mb-3 bg-[#EAE2D5]">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className={cn(
                              "w-full h-full object-cover",
                              !item.available && "grayscale"
                            )}
                            loading="lazy"
                          />
                          {!item.available && (
                            <div className="absolute inset-0 bg-[#1E150F]/60 flex items-center justify-center">
                              <span className="px-3 py-1 bg-stone-900 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                                86'd / Offline
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E6314] block">
                            {category?.name || "General"}
                          </span>
                          <h3 className="font-serif text-base sm:text-lg font-bold text-[#1E150F] leading-snug">
                            {item.name}
                          </h3>
                        </div>

                        <div className="text-right shrink-0">
                          {hasVariants ? (
                            <div>
                              <span className="text-[10px] font-normal text-[#73685C] block">From</span>
                              <span className="font-serif text-base font-bold text-[#1E150F]">
                                {formatINR(Math.min(...item.variants!.map((v) => Number(v.price))))}
                              </span>
                            </div>
                          ) : (
                            <span className="font-serif text-base font-bold text-[#1E150F]">
                              {formatINR(item.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-[#73685C] line-clamp-2 mb-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Variants Summary Badge */}
                      {hasVariants && (
                        <div className="my-2 p-2 bg-[#FAF8F5] rounded-xl border border-[#E5DDD1]/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#73685C] block mb-1">
                            Portion Sizes & Pricing
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.variants!.map((v) => (
                              <span
                                key={v.id || v.name}
                                className={cn(
                                  "text-[10px] font-mono px-2 py-0.5 rounded-md border",
                                  v.available
                                    ? "bg-white text-[#1E150F] border-[#E5DDD1]"
                                    : "bg-stone-200 text-stone-500 line-through border-stone-300"
                                )}
                              >
                                {v.name}: {formatINR(v.price)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dietary Badges & Prep time */}
                      <div className="flex flex-wrap items-center gap-1.5 my-2">
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#73685C] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#E5DDD1]">
                          <Clock className="w-3 h-3 text-[#B88223]" />
                          ~{item.prepTimeMinutes}m
                        </span>
                        {item.dietaryFlags.map((f) => (
                          <DietaryBadge key={f} tag={f} />
                        ))}
                      </div>
                    </div>

                    {/* Controls Footer */}
                    <div className="pt-3 border-t border-[#E5DDD1]/70 flex items-center justify-between gap-2 mt-2">
                      <button
                        onClick={() => handleToggleItemStatus(item)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 btn-smooth-press cursor-pointer border",
                          item.available
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : "bg-red-50 text-red-800 border-red-200 hover:bg-red-100"
                        )}
                      >
                        {item.available ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Live</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>86'd</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-2 text-[#73685C] hover:text-[#1E150F] hover:bg-[#FAF8F5] rounded-xl transition-colors btn-smooth-press cursor-pointer border border-transparent hover:border-[#E5DDD1]"
                          title="Edit Dish"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-2 text-[#73685C] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors btn-smooth-press cursor-pointer"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ──────────────── TAB 2: CATEGORY MANAGEMENT ──────────────── */
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1E150F]">
                Menu Categories Ordering & Status
              </h2>
              <p className="text-xs text-[#73685C] mt-0.5">
                Categories are shown in this order on the guest mobile menu. Use arrows to change priority.
              </p>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-[#1E150F] text-white rounded-xl text-xs font-bold shadow-xs btn-smooth-press cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#B88223]" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {categories.map((cat, idx) => {
              const itemCount = Number(cat.item_count || 0);
              const isActive = cat.is_active !== false;

              return (
                <div
                  key={cat.id}
                  className={cn(
                    "p-4 bg-[#FFFDF9] border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all",
                    isActive ? "border-[#E5DDD1]" : "border-stone-300 opacity-60 bg-stone-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Sort Order Stepper Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveCategory(idx, "up")}
                        className="p-1 rounded-md bg-[#FAF8F5] border border-[#E5DDD1] text-[#73685C] hover:text-[#1E150F] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveCategory(idx, "down")}
                        className="p-1 rounded-md bg-[#FAF8F5] border border-[#E5DDD1] text-[#73685C] hover:text-[#1E150F] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#8E6314]">
                          #{idx + 1}
                        </span>
                        <h3 className="font-serif text-base font-bold text-[#1E150F]">
                          {cat.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                          {itemCount} {itemCount === 1 ? "dish" : "dishes"}
                        </span>
                        {!isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                            Disabled
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-[#73685C] mt-0.5">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleCategoryStatus(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold border btn-smooth-press cursor-pointer",
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          : "bg-stone-200 text-stone-700 border-stone-300 hover:bg-stone-300"
                      )}
                    >
                      {isActive ? "Active" : "Disabled"}
                    </button>

                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-2 text-[#73685C] hover:text-[#1E150F] hover:bg-[#FAF8F5] rounded-xl border border-[#E5DDD1] btn-smooth-press cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleRequestDeleteCategory(cat)}
                      className="p-2 text-[#73685C] hover:text-red-600 hover:bg-red-50 rounded-xl border border-[#E5DDD1] btn-smooth-press cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 1: ADD / EDIT ITEM ──────────────── */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? `Edit Dish · ${editingItem.name}` : "Create In-Room Dining Dish"}
        description="Configure dish details, ingredients, portion sizes and pricing in Indian Rupees (₹)"
      >
        <form onSubmit={handleSaveItem} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
          {/* Category & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Category *
              </label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(Number(e.target.value) || "")}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                required
              >
                <option value="">-- Choose --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Dish Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Artisanal Paneer Tikka or Truffle Tagliolini"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                required
              />
            </div>
          </div>

          {/* Pricing Model: Standard Price vs Portions/Variants */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#1E150F]">
                Pricing Architecture
              </label>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E5DDD1]">
                <button
                  type="button"
                  onClick={() => setPricingType("standard")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    pricingType === "standard"
                      ? "bg-[#1E150F] text-white shadow-2xs"
                      : "text-[#73685C] hover:text-[#1E150F]"
                  )}
                >
                  Standard Price
                </button>
                <button
                  type="button"
                  onClick={() => setPricingType("variants")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    pricingType === "variants"
                      ? "bg-[#1E150F] text-white shadow-2xs"
                      : "text-[#73685C] hover:text-[#1E150F]"
                  )}
                >
                  Sizes / Variants (e.g. Half/Full)
                </button>
              </div>
            </div>

            {pricingType === "standard" ? (
              <div>
                <label className="block text-[11px] font-semibold text-[#73685C] mb-1">
                  Price in Indian Rupees (₹) *
                </label>
                <div className="relative w-44">
                  <span className="absolute left-3 top-2 font-bold text-[#8E6314]">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 450"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-[#E5DDD1] rounded-xl text-xs font-mono font-bold text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-[#73685C]">
                  Configure different portions or sizes with specific rupee prices (e.g. Half / Full, Regular / Grande):
                </p>

                <div className="space-y-2">
                  {itemVariants.map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#E5DDD1]"
                    >
                      <input
                        type="text"
                        placeholder="Variant name (e.g. Half Portion)"
                        value={v.name}
                        onChange={(e) => handleUpdateVariantRow(idx, "name", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-lg text-xs text-[#1E150F]"
                        required
                      />

                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1.5 font-bold text-[#8E6314]">₹</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="Price"
                          value={v.price}
                          onChange={(e) => handleUpdateVariantRow(idx, "price", e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-lg text-xs font-mono font-bold text-[#1E150F]"
                          required
                        />
                      </div>

                      <label className="flex items-center gap-1 text-[11px] text-[#73685C] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.available}
                          onChange={(e) => handleUpdateVariantRow(idx, "available", e.target.checked)}
                          className="rounded text-[#B88223]"
                        />
                        <span>Available</span>
                      </label>

                      {itemVariants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="p-1 text-[#73685C] hover:text-red-600 rounded-md"
                          title="Remove variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddVariantRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#8E6314] hover:text-[#1E150F] bg-white border border-[#ECD7A9] rounded-xl hover:bg-[#FAF8F5] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Size/Variant</span>
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Description & Preparation
            </label>
            <textarea
              rows={2}
              placeholder="Culinary ingredients, taste notes, plating style..."
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          {/* Image URL & Prep Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Photo URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={itemImageUrl}
                onChange={(e) => setItemImageUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
                Prep Time (mins)
              </label>
              <input
                type="number"
                min="1"
                placeholder="20"
                value={itemPrepTime}
                onChange={(e) => setItemPrepTime(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
            </div>
          </div>

          {/* Dietary & Chef's Special Badges */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Dietary Certifications & Chef's Pick
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "veg", label: "Vegetarian (Veg)" },
                { key: "non_veg", label: "Non-Vegetarian" },
                { key: "vegan", label: "Vegan" },
                { key: "gluten_free", label: "Gluten-Free" },
                { key: "spicy", label: "Spicy" },
                { key: "chef_special", label: "Chef's Pick / Signature" },
              ].map(({ key, label }) => {
                const active = itemDietaryFlags.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDietaryFlag(key)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                      active
                        ? "bg-[#1E150F] text-white border-[#1E150F] shadow-2xs"
                        : "bg-[#FAF8F5] text-[#73685C] border-[#E5DDD1] hover:bg-[#F0ECE1]"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Availability Status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="itemAvailableCheckbox"
              checked={itemAvailable}
              onChange={(e) => setItemAvailable(e.target.checked)}
              className="rounded text-[#B88223] w-4 h-4"
            />
            <label htmlFor="itemAvailableCheckbox" className="text-xs font-semibold text-[#1E150F] cursor-pointer">
              Item is currently available to room guests (Uncheck to 86 / Mark offline)
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E5DDD1]">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#73685C] hover:bg-[#FAF8F5] rounded-xl btn-smooth-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingItem}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E150F] hover:bg-[#29231F] rounded-xl shadow-md btn-smooth-press cursor-pointer disabled:opacity-50"
            >
              {isSubmittingItem ? "Saving..." : editingItem ? "Update Dish" : "Create Dish"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ──────────────── MODAL 2: ADD / EDIT CATEGORY ──────────────── */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? `Edit Category · ${editingCategory.name}` : "Create Category"}
        description="Organize your menu sections for resort guests"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Artisanal Breads & Starters, Chef's Mains, Desserts..."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Handcrafted sourdoughs, seasonal antipasti, and light bites"
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="catActiveCheckbox"
              checked={catIsActive}
              onChange={(e) => setCatIsActive(e.target.checked)}
              className="rounded text-[#B88223] w-4 h-4"
            />
            <label htmlFor="catActiveCheckbox" className="text-xs font-semibold text-[#1E150F] cursor-pointer">
              Category is active and visible on guest menus
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E5DDD1]">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#73685C] hover:bg-[#FAF8F5] rounded-xl btn-smooth-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCategory}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E150F] hover:bg-[#29231F] rounded-xl shadow-md btn-smooth-press cursor-pointer disabled:opacity-50"
            >
              {isSubmittingCategory ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ──────────────── MODAL 3: REASSIGN & DELETE CATEGORY SAFEGUARD ──────────────── */}
      <Modal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        title="Category Contains Active Dishes"
        description={`"${deletingCategory?.name}" currently has ${deletingCategory?.item_count} menu items.`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block mb-0.5">Dishes must be reassigned first</span>
              To safely delete this category without losing any menu items or order histories, please choose which category to move all {deletingCategory?.item_count} items to:
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Reassign All Items To:
            </label>
            <select
              value={reassignTargetId}
              onChange={(e) => setReassignTargetId(Number(e.target.value) || "")}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              required
            >
              <option value="">-- Choose Target Category --</option>
              {categories
                .filter((c) => c.id !== deletingCategory?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.item_count || 0} existing dishes)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E5DDD1]">
            <button
              type="button"
              onClick={() => setDeletingCategory(null)}
              className="px-4 py-2 text-xs font-medium text-[#73685C] hover:bg-[#FAF8F5] rounded-xl btn-smooth-press"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingCategory || !reassignTargetId}
              onClick={() => {
                if (deletingCategory && reassignTargetId) {
                  executeDeleteCategory(deletingCategory.id, Number(reassignTargetId));
                }
              }}
              className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md btn-smooth-press cursor-pointer disabled:opacity-50"
            >
              {isDeletingCategory ? "Reassigning & Deleting..." : "Reassign Items & Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
