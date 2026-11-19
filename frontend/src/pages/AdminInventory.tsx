import React, { useState, useEffect, useCallback } from "react";
import {
  Boxes,
  Plus,
  Minus,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  History,
  Settings2,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  User,
  Info,
  DollarSign,
  UtensilsCrossed,
  Tag,
  Building2,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  Trash2,
  Edit3,
} from "lucide-react";
import {
  getInventorySummary,
  getInventoryItems,
  updateInventoryItemSettings,
  adjustInventoryItem,
  getInventoryMovements,
  getRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  adjustRawMaterial,
  getRawMaterialMovements,
  getRecipes,
  saveRecipe,
  InventoryItem,
  InventorySummary,
  InventoryMovement,
  RawMaterial,
  RawMaterialMovement,
  MenuItemRecipe,
  RecipeIngredient,
  getCategories,
  Category,
} from "../lib/api";
import { usePropertyName } from "../lib/usePropertyName";
import { formatINR } from "../lib/currency";
import { Modal } from "../components/Modal";
import { cn } from "../lib/utils";

type InventoryTab = "overview" | "portions" | "raw_materials" | "recipes" | "history";

export function AdminInventory() {
  const propertyName = usePropertyName();
  const [activeTab, setActiveTab] = useState<InventoryTab>("overview");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Summary data
  const [summary, setSummary] = useState<InventorySummary | null>(null);

  // Menu items portion data
  const [menuItems, setMenuItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [portionCategoryFilter, setPortionCategoryFilter] = useState<string>("all");
  const [portionStatusFilter, setPortionStatusFilter] = useState<string>("all");
  const [portionSearch, setPortionSearch] = useState("");

  // Raw materials data
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [rmCategories, setRmCategories] = useState<string[]>([]);
  const [rmSuppliers, setRmSuppliers] = useState<string[]>([]);
  const [rmCategoryFilter, setRmCategoryFilter] = useState<string>("all");
  const [rmSupplierFilter, setRmSupplierFilter] = useState<string>("all");
  const [rmStatusFilter, setRmStatusFilter] = useState<string>("all");
  const [rmSearch, setRmSearch] = useState("");

  // Recipes data
  const [recipes, setRecipes] = useState<MenuItemRecipe[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");

  // Movement history data
  const [portionMovements, setPortionMovements] = useState<InventoryMovement[]>([]);
  const [rmMovements, setRmMovements] = useState<RawMaterialMovement[]>([]);
  const [historyType, setHistoryType] = useState<"all" | "portions" | "raw_materials">("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");

  // ── Modals State ──
  // 1. Portion Settings Modal
  const [isPortionSettingsOpen, setIsPortionSettingsOpen] = useState(false);
  const [selectedPortionItem, setSelectedPortionItem] = useState<InventoryItem | null>(null);
  const [trackInventory, setTrackInventory] = useState(false);
  const [portionQty, setPortionQty] = useState<string>("0");
  const [portionUnit, setPortionUnit] = useState<string>("portions");
  const [lowStockThreshold, setLowStockThreshold] = useState<string>("5");

  // 2. Portion Adjustment Modal
  const [isPortionAdjustOpen, setIsPortionAdjustOpen] = useState(false);
  const [portionAdjustItem, setPortionAdjustItem] = useState<InventoryItem | null>(null);
  const [portionAdjustType, setPortionAdjustType] = useState<"stock_in" | "stock_out" | "adjustment" | "wastage">("stock_in");
  const [portionAdjustQty, setPortionAdjustQty] = useState<string>("");
  const [portionAdjustReason, setPortionAdjustReason] = useState<string>("");

  // 3. Raw Material Create / Edit Modal
  const [isRmModalOpen, setIsRmModalOpen] = useState(false);
  const [editingRm, setEditingRm] = useState<RawMaterial | null>(null);
  const [rmName, setRmName] = useState("");
  const [rmCategory, setRmCategory] = useState("Ingredients");
  const [rmSku, setRmSku] = useState("");
  const [rmBaseUnit, setRmBaseUnit] = useState("kg");
  const [rmCurrentStock, setRmCurrentStock] = useState("0");
  const [rmThreshold, setRmThreshold] = useState("2");
  const [rmSupplier, setRmSupplier] = useState("");
  const [rmUnitCost, setRmUnitCost] = useState("");
  const [rmBatchNumber, setRmBatchNumber] = useState("");
  const [rmExpiryDate, setRmExpiryDate] = useState("");

  // 4. Raw Material Adjust Modal
  const [isRmAdjustOpen, setIsRmAdjustOpen] = useState(false);
  const [adjustingRm, setAdjustingRm] = useState<RawMaterial | null>(null);
  const [rmAdjustType, setRmAdjustType] = useState<"stock_in" | "stock_out" | "adjustment" | "wastage">("stock_in");
  const [rmAdjustQty, setRmAdjustQty] = useState("");
  const [rmAdjustUnit, setRmAdjustUnit] = useState("kg");
  const [rmAdjustReason, setRmAdjustReason] = useState("");
  const [rmAdjustSupplier, setRmAdjustSupplier] = useState("");
  const [rmAdjustInvoice, setRmAdjustInvoice] = useState("");
  const [rmAdjustUnitCost, setRmAdjustUnitCost] = useState("");
  const [rmAdjustBatch, setRmAdjustBatch] = useState("");
  const [rmAdjustExpiry, setRmAdjustExpiry] = useState("");

  // 5. Recipe Editor Modal
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MenuItemRecipe | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<
    Array<{ rawMaterialId: number; quantity: string; unit: string; notes: string }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, itemsRes, catsRes, rmRes, recRes, pMovRes, rmMovRes] = await Promise.all([
        getInventorySummary(),
        getInventoryItems({
          categoryId: portionCategoryFilter,
          status: portionStatusFilter,
          search: portionSearch,
        }),
        getCategories(),
        getRawMaterials({
          category: rmCategoryFilter,
          supplier: rmSupplierFilter,
          status: rmStatusFilter,
          search: rmSearch,
        }),
        getRecipes(),
        getInventoryMovements({ limit: 100 }),
        getRawMaterialMovements({ limit: 100 }),
      ]);

      if (sumRes.success) setSummary(sumRes.summary);
      if (itemsRes.success) setMenuItems(itemsRes.items);
      if (catsRes.categories) setCategories(catsRes.categories);
      if (rmRes.success) {
        setRawMaterials(rmRes.rawMaterials);
        setRmCategories(rmRes.categories);
        setRmSuppliers(rmRes.suppliers);
      }
      if (recRes.success) setRecipes(recRes.recipes);
      if (pMovRes.success) setPortionMovements(pMovRes.movements);
      if (rmMovRes.success) setRmMovements(rmMovRes.movements);
    } catch (err: any) {
      console.error("Error loading inventory data:", err);
      showNotification("error", err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [
    portionCategoryFilter,
    portionStatusFilter,
    portionSearch,
    rmCategoryFilter,
    rmSupplierFilter,
    rmStatusFilter,
    rmSearch,
  ]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle open portion settings
  const handleOpenPortionSettings = (item: InventoryItem) => {
    setSelectedPortionItem(item);
    setTrackInventory(item.track_inventory);
    setPortionQty(String(item.inventory_quantity || 0));
    setPortionUnit(item.inventory_unit || "portions");
    setLowStockThreshold(String(item.low_stock_threshold || 5));
    setIsPortionSettingsOpen(true);
  };

  // Save portion settings
  const handleSavePortionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortionItem) return;
    setIsSubmitting(true);
    try {
      await updateInventoryItemSettings(selectedPortionItem.id, {
        trackInventory,
        inventoryQuantity: parseFloat(portionQty) || 0,
        inventoryUnit: portionUnit,
        lowStockThreshold: parseFloat(lowStockThreshold) || 5,
      });
      showNotification("success", `Updated inventory tracking for "${selectedPortionItem.name}"`);
      setIsPortionSettingsOpen(false);
      loadAllData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save portion settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle open portion adjust
  const handleOpenPortionAdjust = (item: InventoryItem, defaultType: "stock_in" | "stock_out" = "stock_in") => {
    setPortionAdjustItem(item);
    setPortionAdjustType(defaultType);
    setPortionAdjustQty("");
    setPortionAdjustReason("");
    setIsPortionAdjustOpen(true);
  };

  // Submit portion adjust
  const handleSubmitPortionAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portionAdjustItem) return;
    const qty = parseFloat(portionAdjustQty);
    if (isNaN(qty) || qty <= 0) {
      showNotification("error", "Please enter a valid positive quantity");
      return;
    }
    setIsSubmitting(true);
    try {
      await adjustInventoryItem({
        menuItemId: portionAdjustItem.id,
        movementType: portionAdjustType,
        quantity: qty,
        reason: portionAdjustReason,
      });
      showNotification("success", `Stock adjusted for "${portionAdjustItem.name}"`);
      setIsPortionAdjustOpen(false);
      loadAllData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle open Raw Material modal (create or edit)
  const handleOpenRmModal = (rm?: RawMaterial) => {
    if (rm) {
      setEditingRm(rm);
      setRmName(rm.name);
      setRmCategory(rm.category);
      setRmSku(rm.sku || "");
      setRmBaseUnit(rm.base_unit);
      setRmCurrentStock(String(rm.current_stock));
      setRmThreshold(String(rm.low_stock_threshold));
      setRmSupplier(rm.supplier || "");
      setRmUnitCost(rm.unit_cost !== null && rm.unit_cost !== undefined ? String(rm.unit_cost) : "");
      setRmBatchNumber(rm.batch_number || "");
      setRmExpiryDate(rm.expiry_date ? rm.expiry_date.substring(0, 10) : "");
    } else {
      setEditingRm(null);
      setRmName("");
      setRmCategory("Ingredients");
      setRmSku("");
      setRmBaseUnit("kg");
      setRmCurrentStock("0");
      setRmThreshold("2");
      setRmSupplier("");
      setRmUnitCost("");
      setRmBatchNumber("");
      setRmExpiryDate("");
    }
    setIsRmModalOpen(true);
  };

  // Submit Raw Material save
  const handleSubmitRm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmName.trim()) {
      showNotification("error", "Ingredient name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingRm) {
        await updateRawMaterial(editingRm.id, {
          name: rmName.trim(),
          category: rmCategory.trim(),
          sku: rmSku.trim() || undefined,
          lowStockThreshold: parseFloat(rmThreshold) || 2,
          supplier: rmSupplier.trim() || undefined,
          unitCost: rmUnitCost ? parseFloat(rmUnitCost) : undefined,
          batchNumber: rmBatchNumber.trim() || undefined,
          expiryDate: rmExpiryDate || undefined,
        });
        showNotification("success", `Updated raw material "${rmName}"`);
      } else {
        await createRawMaterial({
          name: rmName.trim(),
          category: rmCategory.trim(),
          sku: rmSku.trim() || undefined,
          baseUnit: rmBaseUnit,
          currentStock: parseFloat(rmCurrentStock) || 0,
          lowStockThreshold: parseFloat(rmThreshold) || 2,
          supplier: rmSupplier.trim() || undefined,
          unitCost: rmUnitCost ? parseFloat(rmUnitCost) : undefined,
          batchNumber: rmBatchNumber.trim() || undefined,
          expiryDate: rmExpiryDate || undefined,
        });
        showNotification("success", `Created raw material "${rmName}"`);
      }
      setIsRmModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save raw material");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Raw Material Adjust
  const handleOpenRmAdjust = (rm: RawMaterial, defaultType: "stock_in" | "stock_out" = "stock_in") => {
    setAdjustingRm(rm);
    setRmAdjustType(defaultType);
    setRmAdjustQty("");
    setRmAdjustUnit(rm.base_unit);
    setRmAdjustReason("");
    setRmAdjustSupplier(rm.supplier || "");
    setRmAdjustInvoice("");
    setRmAdjustUnitCost(rm.unit_cost !== null && rm.unit_cost !== undefined ? String(rm.unit_cost) : "");
    setRmAdjustBatch(rm.batch_number || "");
    setRmAdjustExpiry(rm.expiry_date ? rm.expiry_date.substring(0, 10) : "");
    setIsRmAdjustOpen(true);
  };

  // Submit Raw Material Adjust
  const handleSubmitRmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingRm) return;
    const qty = parseFloat(rmAdjustQty);
    if (isNaN(qty) || qty <= 0) {
      showNotification("error", "Please enter a valid positive quantity");
      return;
    }
    setIsSubmitting(true);
    try {
      await adjustRawMaterial(adjustingRm.id, {
        movementType: rmAdjustType,
        quantity: qty,
        unit: rmAdjustUnit,
        reason: rmAdjustReason,
        supplier: rmAdjustSupplier,
        invoiceRef: rmAdjustInvoice,
        unitCost: rmAdjustUnitCost ? parseFloat(rmAdjustUnitCost) : undefined,
        batchNumber: rmAdjustBatch,
        expiryDate: rmAdjustExpiry || undefined,
      });
      showNotification("success", `Stock updated for "${adjustingRm.name}"`);
      setIsRmAdjustOpen(false);
      loadAllData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to adjust raw material stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Recipe Editor Modal
  const handleOpenRecipeModal = (recipe: MenuItemRecipe) => {
    setEditingRecipe(recipe);
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      setRecipeIngredients(
        recipe.ingredients.map((ing) => ({
          rawMaterialId: ing.rawMaterialId,
          quantity: String(ing.quantity),
          unit: ing.unit,
          notes: ing.notes || "",
        }))
      );
    } else {
      setRecipeIngredients([
        {
          rawMaterialId: rawMaterials[0]?.id || 1,
          quantity: "0.100",
          unit: rawMaterials[0]?.base_unit || "kg",
          notes: "",
        },
      ]);
    }
    setIsRecipeModalOpen(true);
  };

  // Add ingredient row in recipe editor
  const handleAddRecipeIngredient = () => {
    const firstRm = rawMaterials[0];
    setRecipeIngredients([
      ...recipeIngredients,
      {
        rawMaterialId: firstRm?.id || 1,
        quantity: "0.100",
        unit: firstRm?.base_unit || "kg",
        notes: "",
      },
    ]);
  };

  // Remove ingredient row in recipe editor
  const handleRemoveRecipeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, idx) => idx !== index));
  };

  // Save recipe
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    for (const ing of recipeIngredients) {
      const q = parseFloat(ing.quantity);
      if (isNaN(q) || q <= 0) {
        showNotification("error", "All ingredient quantities must be positive numbers");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await saveRecipe(
        editingRecipe.menu_item_id,
        recipeIngredients.map((ing) => ({
          rawMaterialId: ing.rawMaterialId,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
          notes: ing.notes,
        }))
      );
      showNotification("success", `Recipe saved for "${editingRecipe.menu_item_name}"`);
      setIsRecipeModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save recipe");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-serif font-medium bg-[#FAF5EB] text-[#B88223] border border-[#B88223]/20">
              <Boxes size={12} />
              {propertyName ? `${propertyName} · Culinary Operations` : "Culinary Operations"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#29231F] mt-1.5">
            Inventory & Recipe Control
          </h1>
          <p className="text-sm text-[#6E6259]">
            Real-time stock monitoring, portions, ingredient recipes, and automated order deduction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E2D9] text-xs font-medium text-[#29231F] hover:bg-[#F3EFEA] transition shadow-sm bg-white"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#B88223]" : ""} />
            Refresh
          </button>
          <button
            onClick={() => handleOpenRmModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#29231F] hover:bg-[#3D352E] text-white text-xs font-medium transition shadow-sm"
          >
            <Plus size={14} />
            New Ingredient
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={cn(
            "p-3 rounded-lg text-xs font-medium mb-6 flex items-center justify-between transition animate-in fade-in duration-200 shadow-sm",
            feedback.type === "success"
              ? "bg-[#F3F9F4] text-[#1B4328] border border-[#2D6A4F]/20"
              : "bg-[#FDF2F2] text-[#7A1C1C] border border-[#B83A3A]/20"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-[#E8E2D9] flex gap-2 sm:gap-6 overflow-x-auto pb-px mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition whitespace-nowrap",
            activeTab === "overview"
              ? "border-[#B88223] text-[#B88223]"
              : "border-transparent text-[#6E6259] hover:text-[#29231F]"
          )}
        >
          <Boxes size={16} />
          Overview & KPI Alerts
          {summary && summary.alerts && summary.alerts.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#B83A3A] text-white font-semibold">
              {summary.alerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("portions")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition whitespace-nowrap",
            activeTab === "portions"
              ? "border-[#B88223] text-[#B88223]"
              : "border-transparent text-[#6E6259] hover:text-[#29231F]"
          )}
        >
          <UtensilsCrossed size={16} />
          Menu Item Portions
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF5EB] text-[#6E6259] border border-[#E8E2D9]">
            {menuItems.filter((m) => m.track_inventory).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("raw_materials")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition whitespace-nowrap",
            activeTab === "raw_materials"
              ? "border-[#B88223] text-[#B88223]"
              : "border-transparent text-[#6E6259] hover:text-[#29231F]"
          )}
        >
          <Package size={16} />
          Raw Materials & Ingredients
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF5EB] text-[#6E6259] border border-[#E8E2D9]">
            {rawMaterials.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("recipes")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition whitespace-nowrap",
            activeTab === "recipes"
              ? "border-[#B88223] text-[#B88223]"
              : "border-transparent text-[#6E6259] hover:text-[#29231F]"
          )}
        >
          <BookOpen size={16} />
          Dish Recipes (BOM)
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF5EB] text-[#6E6259] border border-[#E8E2D9]">
            {recipes.filter((r) => r.ingredients.length > 0).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition whitespace-nowrap",
            activeTab === "history"
              ? "border-[#B88223] text-[#B88223]"
              : "border-transparent text-[#6E6259] hover:text-[#29231F]"
          )}
        >
          <History size={16} />
          Movement History
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW & ALERTS ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Critical Low Stock / Out of Stock Banner */}
          {summary && summary.alerts && summary.alerts.length > 0 ? (
            <div className="bg-[#FFFBF5] border border-[#E8C288] rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[#9A6210] font-serif font-medium mb-3">
                <AlertTriangle size={18} className="text-[#C45E1B]" />
                <span>Restock Attention Required ({summary.alerts.length} items low or depleted)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white border border-[#E8E2D9] rounded-lg p-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            alert.alert_status === "out_of_stock" ? "bg-[#B83A3A]" : "bg-[#D97706]"
                          )}
                        />
                        <span className="text-xs font-medium text-[#29231F]">{alert.name}</span>
                      </div>
                      <p className="text-[11px] text-[#6E6259] mt-0.5">
                        Stock:{" "}
                        <strong
                          className={cn(
                            alert.alert_status === "out_of_stock" ? "text-[#B83A3A]" : "text-[#D97706]"
                          )}
                        >
                          {alert.current_stock} {alert.unit}
                        </strong>{" "}
                        (Threshold: {alert.low_stock_threshold})
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (alert.item_type === "menu_item") {
                          const m = menuItems.find((it) => it.id === alert.id);
                          if (m) handleOpenPortionAdjust(m, "stock_in");
                        } else {
                          const r = rawMaterials.find((rm) => rm.id === alert.id);
                          if (r) handleOpenRmAdjust(r, "stock_in");
                        }
                      }}
                      className="px-2 py-1 text-[11px] font-medium rounded border border-[#B88223]/30 text-[#B88223] bg-[#FAF5EB] hover:bg-[#B88223] hover:text-white transition"
                    >
                      Receive Stock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#F3F9F4] border border-[#2D6A4F]/20 rounded-xl p-4 flex items-center gap-3 text-[#1B4328]">
              <CheckCircle2 size={18} className="text-[#2D6A4F]" />
              <span className="text-xs font-medium">
                All tracked inventory items and raw materials are currently above their safe operating thresholds.
              </span>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Raw Material Inventory Value */}
            <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#6E6259] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Total Raw Material Value</span>
                <DollarSign size={16} className="text-[#B88223]" />
              </div>
              <div className="text-2xl font-serif text-[#29231F]">
                {formatINR(summary?.rawMaterials.totalInventoryValue || 0)}
              </div>
              <p className="text-[11px] text-[#6E6259] mt-1">
                Across {summary?.rawMaterials.totalItems || 0} active ingredient lines
              </p>
            </div>

            {/* Menu Portions on Hand */}
            <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#6E6259] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Tracked Dish Portions</span>
                <UtensilsCrossed size={16} className="text-[#2D6A4F]" />
              </div>
              <div className="text-2xl font-serif text-[#29231F]">
                {summary?.menuItems.totalStockOnHand || 0}
              </div>
              <p className="text-[11px] text-[#6E6259] mt-1">
                {summary?.menuItems.totalTrackedItems || 0} items portion tracked
              </p>
            </div>

            {/* Low Stock Items */}
            <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#6E6259] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Low Stock Warnings</span>
                <AlertTriangle size={16} className="text-[#D97706]" />
              </div>
              <div className="text-2xl font-serif text-[#D97706]">
                {(summary?.menuItems.lowStockCount || 0) + (summary?.rawMaterials.lowStockCount || 0)}
              </div>
              <p className="text-[11px] text-[#6E6259] mt-1">
                {summary?.rawMaterials.lowStockCount || 0} raw materials, {summary?.menuItems.lowStockCount || 0} dishes
              </p>
            </div>

            {/* Out of Stock Depletions */}
            <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#6E6259] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Depleted / Zero Stock</span>
                <XCircle size={16} className="text-[#B83A3A]" />
              </div>
              <div className="text-2xl font-serif text-[#B83A3A]">
                {(summary?.menuItems.outOfStockCount || 0) + (summary?.rawMaterials.outOfStockCount || 0)}
              </div>
              <p className="text-[11px] text-[#6E6259] mt-1">Immediate requisition needed</p>
            </div>
          </div>

          {/* Stock on Hand by Physical Unit */}
          <div className="bg-white border border-[#E8E2D9] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-serif font-medium text-[#29231F] mb-3">
              Stock on Hand by Physical Dimension (Units preserved without mixing)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {summary?.rawMaterials.byUnit.map((u, i) => (
                <div key={i} className="bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg p-3 text-center">
                  <span className="text-xs text-[#6E6259] uppercase tracking-wider font-medium">{u.unit}</span>
                  <div className="text-lg font-serif text-[#29231F] mt-1">{u.quantity.toFixed(2)}</div>
                  <span className="text-[10px] text-[#A3968C]">Raw Materials</span>
                </div>
              ))}
              {summary?.menuItems.byUnit.map((u, i) => (
                <div key={`m-${i}`} className="bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg p-3 text-center">
                  <span className="text-xs text-[#6E6259] uppercase tracking-wider font-medium">{u.unit}</span>
                  <div className="text-lg font-serif text-[#29231F] mt-1">{u.quantity.toFixed(1)}</div>
                  <span className="text-[10px] text-[#A3968C]">Menu Portions</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MENU ITEM PORTIONS ── */}
      {activeTab === "portions" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-[#E8E2D9] p-3 rounded-xl shadow-xs">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3968C]" />
              <input
                type="text"
                placeholder="Search dish name..."
                value={portionSearch}
                onChange={(e) => setPortionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] focus:outline-none focus:border-[#B88223] bg-[#FAF8F5]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={portionCategoryFilter}
                onChange={(e) => setPortionCategoryFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={portionStatusFilter}
                onChange={(e) => setPortionStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
              >
                <option value="all">All Statuses</option>
                <option value="tracked">Tracked Only</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="untracked">Untracked</option>
              </select>
            </div>
          </div>

          {/* Portions Table */}
          <div className="bg-white border border-[#E8E2D9] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] text-[#6E6259] border-b border-[#E8E2D9] font-medium">
                    <th className="py-3 px-4">Menu Item & Category</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Portion Stock</th>
                    <th className="py-3 px-4">Threshold</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Recipe Link</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D9]">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FCFBF9] transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#29231F]">{item.name}</div>
                        <div className="text-[11px] text-[#6E6259]">{item.category_name}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#29231F]">
                        {formatINR(item.price)}
                      </td>
                      <td className="py-3 px-4">
                        {item.track_inventory ? (
                          <span className="font-mono font-semibold text-[#29231F]">
                            {item.inventory_quantity} {item.inventory_unit}
                          </span>
                        ) : (
                          <span className="text-[#A3968C] italic">Untracked (Made to order)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#6E6259]">
                        {item.track_inventory ? `${item.low_stock_threshold} ${item.inventory_unit}` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {item.stock_status === "in_stock" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EBF7EE] text-[#1B4328] border border-[#2D6A4F]/20">
                            In Stock
                          </span>
                        )}
                        {item.stock_status === "low_stock" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFF7ED] text-[#9A3412] border border-[#EA580C]/20">
                            Low Stock
                          </span>
                        )}
                        {item.stock_status === "out_of_stock" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF2F2] text-[#991B1B] border border-[#DC2626]/20">
                            Out of Stock
                          </span>
                        )}
                        {item.stock_status === "untracked" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F3EFEA] text-[#6E6259] border border-[#E8E2D9]">
                            Untracked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {(item.recipe_ingredients_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#2D6A4F] font-medium">
                            <BookOpen size={12} />
                            {item.recipe_ingredients_count} ingredients
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#A3968C]">No recipe</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.track_inventory && (
                            <>
                              <button
                                onClick={() => handleOpenPortionAdjust(item, "stock_in")}
                                title="Receive / Add Stock"
                                className="p-1.5 rounded hover:bg-[#EBF7EE] text-[#2D6A4F] transition"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenPortionAdjust(item, "stock_out")}
                                title="Stock Out / Wastage"
                                className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#991B1B] transition"
                              >
                                <Minus size={14} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenPortionSettings(item)}
                            title="Configure Tracking & Thresholds"
                            className="p-1.5 rounded hover:bg-[#F3EFEA] text-[#6E6259] transition"
                          >
                            <Settings2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {menuItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#A3968C] italic">
                        No menu items found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: RAW MATERIALS & INGREDIENTS ── */}
      {activeTab === "raw_materials" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-[#E8E2D9] p-3 rounded-xl shadow-xs">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3968C]" />
              <input
                type="text"
                placeholder="Search raw material name or SKU..."
                value={rmSearch}
                onChange={(e) => setRmSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] focus:outline-none focus:border-[#B88223] bg-[#FAF8F5]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={rmCategoryFilter}
                onChange={(e) => setRmCategoryFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
              >
                <option value="all">All Categories</option>
                {rmCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={rmSupplierFilter}
                onChange={(e) => setRmSupplierFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
              >
                <option value="all">All Suppliers</option>
                {rmSuppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={rmStatusFilter}
                onChange={(e) => setRmStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
              >
                <option value="all">All Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Raw Materials Table */}
          <div className="bg-white border border-[#E8E2D9] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] text-[#6E6259] border-b border-[#E8E2D9] font-medium">
                    <th className="py-3 px-4">Ingredient Name & SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Threshold</th>
                    <th className="py-3 px-4">Unit Cost (INR)</th>
                    <th className="py-3 px-4">Total Value</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D9]">
                  {rawMaterials.map((rm) => (
                    <tr key={rm.id} className="hover:bg-[#FCFBF9] transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#29231F]">{rm.name}</div>
                        {rm.sku && <div className="text-[10px] text-[#A3968C] font-mono">{rm.sku}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] bg-[#FAF5EB] text-[#6E6259] border border-[#E8E2D9]">
                          {rm.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#29231F]">
                        {rm.current_stock.toFixed(3)} {rm.base_unit}
                      </td>
                      <td className="py-3 px-4 text-[#6E6259]">
                        {rm.low_stock_threshold} {rm.base_unit}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#29231F]">
                        {rm.unit_cost ? formatINR(rm.unit_cost) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#29231F]">
                        {formatINR(rm.total_value || 0)}
                      </td>
                      <td className="py-3 px-4 text-[#6E6259]">{rm.supplier || "—"}</td>
                      <td className="py-3 px-4">
                        {rm.stock_status === "in_stock" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EBF7EE] text-[#1B4328] border border-[#2D6A4F]/20">
                            In Stock
                          </span>
                        )}
                        {rm.stock_status === "low_stock" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFF7ED] text-[#9A3412] border border-[#EA580C]/20">
                            Low Stock
                          </span>
                        )}
                        {rm.stock_status === "out_of_stock" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF2F2] text-[#991B1B] border border-[#DC2626]/20">
                            Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRmAdjust(rm, "stock_in")}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-[#E8E2D9] text-[#29231F] hover:bg-[#F3EFEA] transition shadow-2xs"
                          >
                            Receive / Adjust
                          </button>
                          <button
                            onClick={() => handleOpenRmModal(rm)}
                            className="p-1 rounded text-[#6E6259] hover:bg-[#F3EFEA] transition"
                            title="Edit details"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rawMaterials.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-[#A3968C] italic">
                        No raw materials found. Click "+ New Ingredient" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: DISH RECIPES (BILL OF MATERIALS) ── */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-[#E8E2D9] p-3 rounded-xl shadow-xs">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3968C]" />
              <input
                type="text"
                placeholder="Search recipe by menu dish name..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] focus:outline-none focus:border-[#B88223] bg-[#FAF8F5]"
              />
            </div>
            <span className="text-xs text-[#6E6259]">
              Configured dishes automatically deduct ingredients on order placement.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes
              .filter((r) =>
                recipeSearch ? r.menu_item_name.toLowerCase().includes(recipeSearch.toLowerCase()) : true
              )
              .map((rec) => {
                // Calculate estimated recipe cost
                const calculatedCost = rec.ingredients.reduce((acc, ing) => {
                  if (ing.unitCost && ing.quantity) {
                    return acc + ing.unitCost * ing.quantity;
                  }
                  return acc;
                }, 0);

                const marginPercent =
                  rec.menu_item_price > 0
                    ? Math.round(((rec.menu_item_price - calculatedCost) / rec.menu_item_price) * 100)
                    : 0;

                return (
                  <div
                    key={rec.menu_item_id}
                    className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] text-[#A3968C] uppercase tracking-wider font-medium">
                            {rec.category_name}
                          </span>
                          <h4 className="text-sm font-serif font-medium text-[#29231F] mt-0.5">
                            {rec.menu_item_name}
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-semibold text-[#29231F]">
                          {formatINR(rec.menu_item_price)}
                        </span>
                      </div>

                      {/* Ingredients List */}
                      <div className="mt-3 pt-3 border-t border-[#F3EFEA] space-y-1.5">
                        <div className="text-[11px] font-medium text-[#6E6259] mb-1">
                          Recipe Ingredients ({rec.ingredients.length}):
                        </div>
                        {rec.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-[#29231F]">
                            <span>• {ing.rawMaterialName}</span>
                            <span className="font-mono text-[#6E6259]">
                              {ing.quantity} {ing.unit}
                            </span>
                          </div>
                        ))}
                        {rec.ingredients.length === 0 && (
                          <p className="text-[11px] text-[#A3968C] italic">No ingredients linked yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F3EFEA] flex items-center justify-between">
                      <div>
                        {calculatedCost > 0 && (
                          <div className="text-[11px] text-[#6E6259]">
                            Plate Cost: <strong className="text-[#29231F]">{formatINR(calculatedCost)}</strong>{" "}
                            <span className="text-[#2D6A4F] font-medium">({marginPercent}% margin)</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleOpenRecipeModal(rec)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#B88223]/30 text-[#B88223] bg-[#FAF5EB] hover:bg-[#B88223] hover:text-white transition"
                      >
                        {rec.ingredients.length > 0 ? "Edit Recipe" : "+ Add Recipe"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── TAB 5: MOVEMENT HISTORY ── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-[#E8E2D9] p-3 rounded-xl shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryType("all")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition",
                  historyType === "all" ? "bg-[#29231F] text-white" : "text-[#6E6259] hover:bg-[#F3EFEA]"
                )}
              >
                All Movements
              </button>
              <button
                onClick={() => setHistoryType("portions")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition",
                  historyType === "portions" ? "bg-[#29231F] text-white" : "text-[#6E6259] hover:bg-[#F3EFEA]"
                )}
              >
                Menu Portions
              </button>
              <button
                onClick={() => setHistoryType("raw_materials")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition",
                  historyType === "raw_materials"
                    ? "bg-[#29231F] text-white"
                    : "text-[#6E6259] hover:bg-[#F3EFEA]"
                )}
              >
                Raw Materials
              </button>
            </div>

            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
            >
              <option value="all">All Movement Types</option>
              <option value="stock_in">Stock In</option>
              <option value="stock_out">Stock Out</option>
              <option value="order_deduction">Order Deduction</option>
              <option value="recipe_consumption">Recipe Consumption</option>
              <option value="order_reversal">Order Reversal</option>
              <option value="adjustment">Manual Adjustment</option>
              <option value="wastage">Wastage</option>
            </select>
          </div>

          {/* Movements Audit List */}
          <div className="bg-white border border-[#E8E2D9] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] text-[#6E6259] border-b border-[#E8E2D9] font-medium">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Item / Raw Material</th>
                    <th className="py-3 px-4">Quantity Changed</th>
                    <th className="py-3 px-4">Balance After</th>
                    <th className="py-3 px-4">Reason / Order #</th>
                    <th className="py-3 px-4 text-right">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D9]">
                  {/* Combine or show selected movements */}
                  {(() => {
                    const combined: Array<{
                      id: string;
                      date: string;
                      category: "portion" | "raw_material";
                      name: string;
                      type: string;
                      qty: number;
                      unit: string;
                      balance: number;
                      reason: string;
                      performedBy: string;
                      orderId?: number | null;
                    }> = [];

                    if (historyType === "all" || historyType === "portions") {
                      portionMovements.forEach((m) => {
                        if (movementTypeFilter === "all" || m.movement_type === movementTypeFilter) {
                          combined.push({
                            id: `p-${m.id}`,
                            date: m.created_at,
                            category: "portion",
                            name: m.menu_item_name || `Item #${m.menu_item_id}`,
                            type: m.movement_type,
                            qty: m.quantity,
                            unit: m.unit,
                            balance: m.balance_after,
                            reason: m.reason || "",
                            performedBy: m.performed_by,
                            orderId: m.order_id,
                          });
                        }
                      });
                    }

                    if (historyType === "all" || historyType === "raw_materials") {
                      rmMovements.forEach((rm) => {
                        if (movementTypeFilter === "all" || rm.movement_type === movementTypeFilter) {
                          combined.push({
                            id: `rm-${rm.id}`,
                            date: rm.created_at,
                            category: "raw_material",
                            name: rm.raw_material_name || `Raw Material #${rm.raw_material_id}`,
                            type: rm.movement_type,
                            qty: rm.quantity,
                            unit: rm.unit,
                            balance: rm.balance_after,
                            reason: rm.reason || "",
                            performedBy: rm.performed_by,
                            orderId: rm.order_id,
                          });
                        }
                      });
                    }

                    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return combined.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#FCFBF9] transition">
                        <td className="py-3 px-4 text-[#6E6259] whitespace-nowrap">
                          {new Date(entry.date).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                              entry.type === "stock_in" || entry.type === "opening_stock"
                                ? "bg-[#EBF7EE] text-[#1B4328] border border-[#2D6A4F]/20"
                                : entry.type === "order_reversal"
                                ? "bg-[#F3E8FF] text-[#6B21A8] border border-[#9333EA]/20"
                                : entry.type === "wastage"
                                ? "bg-[#FEF2F2] text-[#991B1B] border border-[#DC2626]/20"
                                : "bg-[#FFF7ED] text-[#9A3412] border border-[#EA580C]/20"
                            )}
                          >
                            {entry.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#29231F]">
                          {entry.name}{" "}
                          <span className="text-[10px] text-[#A3968C] font-normal">
                            ({entry.category === "portion" ? "Dish Portion" : "Raw Ingredient"})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          <span
                            className={cn(
                              entry.type === "stock_in" ||
                                entry.type === "opening_stock" ||
                                entry.type === "order_reversal"
                                ? "text-[#2D6A4F]"
                                : "text-[#991B1B]"
                            )}
                          >
                            {entry.type === "stock_in" ||
                            entry.type === "opening_stock" ||
                            entry.type === "order_reversal"
                              ? "+"
                              : "-"}
                            {entry.qty} {entry.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-[#29231F]">
                          {entry.balance} {entry.unit}
                        </td>
                        <td className="py-3 px-4 text-[#6E6259]">{entry.reason || "—"}</td>
                        <td className="py-3 px-4 text-right text-[#A3968C] font-mono text-[11px]">
                          {entry.performedBy}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: PORTION SETTINGS MODAL ── */}
      <Modal
        isOpen={isPortionSettingsOpen}
        onClose={() => setIsPortionSettingsOpen(false)}
        title={`Portion Tracking · ${selectedPortionItem?.name}`}
      >
        <form onSubmit={handleSavePortionSettings} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg">
            <div>
              <div className="text-xs font-medium text-[#29231F]">Enable Inventory Tracking</div>
              <div className="text-[11px] text-[#6E6259]">
                Automatically track stock balances for this dish
              </div>
            </div>
            <input
              type="checkbox"
              checked={trackInventory}
              onChange={(e) => setTrackInventory(e.target.checked)}
              className="w-4 h-4 text-[#B88223] rounded focus:ring-[#B88223]"
            />
          </div>

          {trackInventory && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#29231F] mb-1">
                  Current Stock on Hand
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={portionQty}
                  onChange={(e) => setPortionQty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#29231F] mb-1">
                    Portion Unit
                  </label>
                  <select
                    value={portionUnit}
                    onChange={(e) => setPortionUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                  >
                    <option value="portions">portions</option>
                    <option value="pieces">pieces</option>
                    <option value="packs">packs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#29231F] mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsPortionSettingsOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: PORTION ADJUST MODAL ── */}
      <Modal
        isOpen={isPortionAdjustOpen}
        onClose={() => setIsPortionAdjustOpen(false)}
        title={`Stock Adjustment · ${portionAdjustItem?.name}`}
      >
        <form onSubmit={handleSubmitPortionAdjust} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Movement Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPortionAdjustType("stock_in")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  portionAdjustType === "stock_in"
                    ? "bg-[#EBF7EE] text-[#1B4328] border-[#2D6A4F]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                + Stock In (Receive)
              </button>
              <button
                type="button"
                onClick={() => setPortionAdjustType("stock_out")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  portionAdjustType === "stock_out"
                    ? "bg-[#FEF2F2] text-[#991B1B] border-[#DC2626]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                - Stock Out (Dispense)
              </button>
              <button
                type="button"
                onClick={() => setPortionAdjustType("wastage")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  portionAdjustType === "wastage"
                    ? "bg-[#FFF7ED] text-[#9A3412] border-[#EA580C]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                - Wastage (Spoilage)
              </button>
              <button
                type="button"
                onClick={() => setPortionAdjustType("adjustment")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  portionAdjustType === "adjustment"
                    ? "bg-[#FAF5EB] text-[#B88223] border-[#B88223]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                = Reset Exact Balance
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">
              Quantity ({portionAdjustItem?.inventory_unit})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={portionAdjustQty}
              onChange={(e) => setPortionAdjustQty(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">
              Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={portionAdjustReason}
              onChange={(e) => setPortionAdjustReason(e.target.value)}
              placeholder="e.g. Morning pastry batch freshly baked"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsPortionAdjustOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Confirm Adjustment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 3: RAW MATERIAL CREATE / EDIT ── */}
      <Modal
        isOpen={isRmModalOpen}
        onClose={() => setIsRmModalOpen(false)}
        title={editingRm ? `Edit Ingredient · ${editingRm.name}` : "Create New Raw Material"}
      >
        <form onSubmit={handleSubmitRm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#29231F] mb-1">Ingredient Name</label>
              <input
                type="text"
                value={rmName}
                onChange={(e) => setRmName(e.target.value)}
                placeholder="e.g. Valrhona Dark Chocolate 70%"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">Category</label>
              <input
                type="text"
                value={rmCategory}
                onChange={(e) => setRmCategory(e.target.value)}
                placeholder="e.g. Dairy, Bakery, Proteins"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">SKU / Code</label>
              <input
                type="text"
                value={rmSku}
                onChange={(e) => setRmSku(e.target.value)}
                placeholder="e.g. RAW-CHOC-01"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              />
            </div>

            {!editingRm && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#29231F] mb-1">Base Unit</label>
                  <select
                    value={rmBaseUnit}
                    onChange={(e) => setRmBaseUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="litres">Litres (litres)</option>
                    <option value="pieces">Pieces (pieces)</option>
                    <option value="packs">Packs (packs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#29231F] mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={rmCurrentStock}
                    onChange={(e) => setRmCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">
                Low Stock Threshold ({rmBaseUnit})
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={rmThreshold}
                onChange={(e) => setRmThreshold(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">
                Unit Cost in INR (₹ per {rmBaseUnit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rmUnitCost}
                onChange={(e) => setRmUnitCost(e.target.value)}
                placeholder="e.g. 1500.00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">Supplier</label>
              <input
                type="text"
                value={rmSupplier}
                onChange={(e) => setRmSupplier(e.target.value)}
                placeholder="e.g. Gourmet Imports Ltd"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">Batch Number</label>
              <input
                type="text"
                value={rmBatchNumber}
                onChange={(e) => setRmBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-2026-X"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#29231F] mb-1">Expiry Date</label>
              <input
                type="date"
                value={rmExpiryDate}
                onChange={(e) => setRmExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsRmModalOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingRm ? "Save Changes" : "Create Ingredient"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 4: RAW MATERIAL ADJUST MODAL ── */}
      <Modal
        isOpen={isRmAdjustOpen}
        onClose={() => setIsRmAdjustOpen(false)}
        title={`Adjust Stock · ${adjustingRm?.name}`}
      >
        <form onSubmit={handleSubmitRmAdjust} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Movement Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRmAdjustType("stock_in")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  rmAdjustType === "stock_in"
                    ? "bg-[#EBF7EE] text-[#1B4328] border-[#2D6A4F]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                + Stock In (Purchase / Receive)
              </button>
              <button
                type="button"
                onClick={() => setRmAdjustType("stock_out")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  rmAdjustType === "stock_out"
                    ? "bg-[#FEF2F2] text-[#991B1B] border-[#DC2626]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                - Stock Out (Manual Usage)
              </button>
              <button
                type="button"
                onClick={() => setRmAdjustType("wastage")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  rmAdjustType === "wastage"
                    ? "bg-[#FFF7ED] text-[#9A3412] border-[#EA580C]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                - Wastage / Spoilage
              </button>
              <button
                type="button"
                onClick={() => setRmAdjustType("adjustment")}
                className={cn(
                  "py-2 text-xs font-medium rounded-lg border text-center transition",
                  rmAdjustType === "adjustment"
                    ? "bg-[#FAF5EB] text-[#B88223] border-[#B88223]"
                    : "border-[#E8E2D9] text-[#6E6259] hover:bg-[#FAF8F5]"
                )}
              >
                = Reset Exact Balance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">Quantity</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={rmAdjustQty}
                onChange={(e) => setRmAdjustQty(e.target.value)}
                placeholder="e.g. 5.0"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">Unit</label>
              <select
                value={rmAdjustUnit}
                onChange={(e) => setRmAdjustUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              >
                {adjustingRm?.base_unit === "kg" && (
                  <>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                  </>
                )}
                {adjustingRm?.base_unit === "litres" && (
                  <>
                    <option value="litres">Litres (litres)</option>
                    <option value="ml">Millilitres (ml)</option>
                  </>
                )}
                {adjustingRm?.base_unit === "pieces" && <option value="pieces">Pieces</option>}
                {adjustingRm?.base_unit === "packs" && <option value="packs">Packs</option>}
              </select>
            </div>
          </div>

          {rmAdjustType === "stock_in" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#29231F] mb-1">Invoice / PO Reference</label>
                <input
                  type="text"
                  value={rmAdjustInvoice}
                  onChange={(e) => setRmAdjustInvoice(e.target.value)}
                  placeholder="e.g. INV-98432"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#29231F] mb-1">
                  Unit Cost (₹ per {adjustingRm?.base_unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rmAdjustUnitCost}
                  onChange={(e) => setRmAdjustUnitCost(e.target.value)}
                  placeholder="e.g. 2200.00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Reason / Notes</label>
            <input
              type="text"
              value={rmAdjustReason}
              onChange={(e) => setRmAdjustReason(e.target.value)}
              placeholder="e.g. Weekly vendor stock delivery"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsRmAdjustOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Recording..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 5: RECIPE EDITOR MODAL ── */}
      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        title={`Dish Recipe Bill of Materials · ${editingRecipe?.menu_item_name}`}
      >
        <form onSubmit={handleSaveRecipe} className="space-y-4">
          <p className="text-xs text-[#6E6259]">
            Specify the exact ingredient quantities consumed per single serving of this dish.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {recipeIngredients.map((row, idx) => {
              const selectedRm = rawMaterials.find((r) => r.id === row.rawMaterialId);
              return (
                <div
                  key={idx}
                  className="p-3 bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#29231F]">
                      Ingredient #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipeIngredient(idx)}
                      className="text-[#991B1B] hover:text-[#DC2626] transition p-1"
                      title="Remove ingredient"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <select
                        value={row.rawMaterialId}
                        onChange={(e) => {
                          const newId = Number(e.target.value);
                          const rm = rawMaterials.find((r) => r.id === newId);
                          const newRows = [...recipeIngredients];
                          newRows[idx].rawMaterialId = newId;
                          if (rm) newRows[idx].unit = rm.base_unit;
                          setRecipeIngredients(newRows);
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                      >
                        {rawMaterials.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.name} ({rm.base_unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={row.quantity}
                        onChange={(e) => {
                          const newRows = [...recipeIngredients];
                          newRows[idx].quantity = e.target.value;
                          setRecipeIngredients(newRows);
                        }}
                        placeholder="Quantity"
                        className="w-full px-2 py-1.5 text-xs rounded border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                        required
                      />
                    </div>

                    <div>
                      <select
                        value={row.unit}
                        onChange={(e) => {
                          const newRows = [...recipeIngredients];
                          newRows[idx].unit = e.target.value;
                          setRecipeIngredients(newRows);
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                      >
                        {selectedRm?.base_unit === "kg" && (
                          <>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </>
                        )}
                        {selectedRm?.base_unit === "litres" && (
                          <>
                            <option value="litres">litres</option>
                            <option value="ml">ml</option>
                          </>
                        )}
                        {selectedRm?.base_unit === "pieces" && <option value="pieces">pieces</option>}
                        {selectedRm?.base_unit === "packs" && <option value="packs">packs</option>}
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => {
                      const newRows = [...recipeIngredients];
                      newRows[idx].notes = e.target.value;
                      setRecipeIngredients(newRows);
                    }}
                    placeholder="Preparation notes (e.g. freshly grated, toasted, emulsion)"
                    className="w-full px-2 py-1 text-[11px] rounded border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddRecipeIngredient}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B88223] hover:text-[#9A6210] transition"
          >
            <Plus size={14} />
            + Add Another Ingredient
          </button>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsRecipeModalOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Saving Recipe..." : "Save Recipe"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminInventory;
