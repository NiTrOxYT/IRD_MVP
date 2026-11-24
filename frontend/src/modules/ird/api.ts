import { httpClient } from "../../core/transport/httpClient";
import type {
  AnalyticsRange,
  AnalyticsReport,
  Category,
  InventoryItem,
  InventoryMovement,
  InventorySummary,
  IrdHttpClient,
  MenuItem,
  MenuItemRecipe,
  Order,
  RawMaterial,
  RawMaterialMovement,
  RecipeIngredient,
} from "./types";

export function createIrdApi(http: IrdHttpClient = httpClient) {
  return {
    // ── Menu ──
    async getGuestMenu() {
      return http.request<{ categories: Category[]; items: MenuItem[] }>("/menu");
    },

    async getAdminMenu() {
      return http.request<{ categories: Category[]; items: MenuItem[] }>("/menu/admin");
    },

    async getCategories() {
      return http.request<{ categories: Category[] }>("/menu/categories");
    },

    async createCategory(data: { name: string; description?: string; sortOrder?: number; isActive?: boolean }) {
      return http.request<{ category: Category }>("/menu/categories", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateCategory(id: number, data: { name?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
      return http.request<{ category: Category }>(`/menu/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async toggleCategoryStatus(id: number, isActive: boolean) {
      return http.request<{ success: boolean; category: Category }>(`/menu/categories/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },

    async reorderCategories(items: Array<{ id: number; sortOrder: number }>) {
      return http.request<{ success: boolean; categories: Category[] }>("/menu/categories/reorder", {
        method: "PATCH",
        body: JSON.stringify({ items, orders: items }),
      });
    },

    async deleteCategory(id: number, reassignToId?: number) {
      return http.request<{ success: boolean }>(`/menu/categories/${id}`, {
        method: "DELETE",
        body: JSON.stringify(reassignToId ? { reassignToId } : {}),
      });
    },

    async toggleItemAvailability(itemId: number, available: boolean) {
      return http.request<{ success: boolean; item: { id: number; available: boolean } }>(
        `/menu/items/${itemId}/availability`,
        {
          method: "PATCH",
          body: JSON.stringify({ available }),
        }
      );
    },

    async createMenuItem(data: Partial<MenuItem>) {
      return http.request<{ item: MenuItem }>("/menu/items", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateMenuItem(itemId: number, data: Partial<MenuItem>) {
      return http.request<{ item: MenuItem }>(`/menu/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async deleteMenuItem(itemId: number) {
      return http.request<{ success: boolean }>(`/menu/items/${itemId}`, { method: "DELETE" });
    },

    // ── Orders ──
    async placeOrder(data: {
      items: Array<{
        menuItemId: number;
        variantId?: number | null;
        quantity: number;
        modifierIds?: number[];
        notes?: string;
      }>;
      specialInstructions?: string;
    }) {
      return http.request<{ success: boolean; order: Order; guestOrderToken: string }>("/orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getStayOrders() {
      return http.request<{ orders: Order[] }>("/orders/stay");
    },

    async getOrder(orderId: number) {
      return http.request<{ order: Order }>(`/orders/${orderId}`);
    },

    async cancelGuestOrder(orderId: number) {
      return http.request<{ success: boolean; order: Order }>(`/orders/${orderId}/cancel`, {
        method: "POST",
      });
    },

    async listAdminOrders(filters?: {
      status?: string;
      room?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }) {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== "all") params.set("status", filters.status);
      if (filters?.room) params.set("room", filters.room);
      if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters?.dateTo) params.set("dateTo", filters.dateTo);
      if (filters?.limit !== undefined) params.set("limit", String(filters.limit));
      if (filters?.offset !== undefined) params.set("offset", String(filters.offset));
      const q = params.toString() ? `?${params.toString()}` : "";
      return http.request<{ orders: Order[]; total: number }>(`/orders${q}`);
    },

    async updateOrderStatus(orderId: number, status: string, rejectionReason?: string) {
      return http.request<{ success: boolean; order: Order }>(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectionReason }),
      });
    },

    // ── Kitchen KOT ──
    async getKitchenTickets() {
      return http.request<{ tickets: any[] }>("/kitchen/tickets");
    },

    async advanceKitchenTicket(ticketId: number) {
      return http.request<{ success: boolean; order: any }>(`/kitchen/tickets/${ticketId}/advance`, {
        method: "POST",
      });
    },

    // ── Inventory & Recipes ──
    async getInventorySummary() {
      return http.request<{ success: boolean; summary: InventorySummary }>("/inventory/summary");
    },

    async getInventoryItems(filters?: { categoryId?: string; status?: string; search?: string }) {
      const params = new URLSearchParams();
      if (filters?.categoryId && filters.categoryId !== "all") params.set("categoryId", filters.categoryId);
      if (filters?.status && filters.status !== "all") params.set("status", filters.status);
      if (filters?.search) params.set("search", filters.search);
      const q = params.toString() ? `?${params.toString()}` : "";
      return http.request<{ success: boolean; items: InventoryItem[] }>(`/inventory/items${q}`);
    },

    async updateInventoryItemSettings(
      id: number,
      data: { trackInventory?: boolean; inventoryQuantity?: number; inventoryUnit?: string; lowStockThreshold?: number }
    ) {
      return http.request<{ success: boolean; item: InventoryItem }>(`/inventory/items/${id}/settings`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    async adjustInventoryItem(data: {
      menuItemId: number;
      movementType: "stock_in" | "stock_out" | "adjustment" | "wastage";
      quantity: number;
      reason?: string;
    }) {
      return http.request<{ success: boolean; movement: InventoryMovement; newBalance: number }>(
        "/inventory/items/adjust",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },

    async getInventoryMovements(filters?: {
      menuItemId?: number;
      movementType?: string;
      limit?: number;
      offset?: number;
    }) {
      const params = new URLSearchParams();
      if (filters?.menuItemId) params.set("menuItemId", String(filters.menuItemId));
      if (filters?.movementType && filters.movementType !== "all") params.set("movementType", filters.movementType);
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.offset) params.set("offset", String(filters.offset));
      const q = params.toString() ? `?${params.toString()}` : "";
      return http.request<{ success: boolean; total: number; movements: InventoryMovement[] }>(
        `/inventory/movements${q}`
      );
    },

    async getRawMaterials(filters?: {
      category?: string;
      supplier?: string;
      status?: string;
      search?: string;
    }) {
      const params = new URLSearchParams();
      if (filters?.category && filters.category !== "all") params.set("category", filters.category);
      if (filters?.supplier && filters.supplier !== "all") params.set("supplier", filters.supplier);
      if (filters?.status && filters.status !== "all") params.set("status", filters.status);
      if (filters?.search) params.set("search", filters.search);
      const q = params.toString() ? `?${params.toString()}` : "";
      return http.request<{
        success: boolean;
        rawMaterials: RawMaterial[];
        categories: string[];
        suppliers: string[];
      }>(`/inventory/raw-materials${q}`);
    },

    async createRawMaterial(data: {
      name: string;
      category?: string;
      sku?: string;
      baseUnit: string;
      currentStock?: number;
      lowStockThreshold?: number;
      supplier?: string;
      unitCost?: number;
      batchNumber?: string;
      expiryDate?: string;
    }) {
      return http.request<{ success: boolean; rawMaterial: RawMaterial }>("/inventory/raw-materials", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateRawMaterial(
      id: number,
      data: Partial<RawMaterial> & {
        lowStockThreshold?: number;
        unitCost?: number;
        batchNumber?: string;
        expiryDate?: string;
        isArchived?: boolean;
      }
    ) {
      return http.request<{ success: boolean; rawMaterial: RawMaterial }>(`/inventory/raw-materials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async adjustRawMaterial(
      id: number,
      data: {
        movementType: "stock_in" | "stock_out" | "adjustment" | "wastage";
        quantity: number;
        unit?: string;
        reason?: string;
        supplier?: string;
        invoiceRef?: string;
        unitCost?: number;
        batchNumber?: string;
        expiryDate?: string;
      }
    ) {
      return http.request<{ success: boolean; movement: RawMaterialMovement; newBalance: number; baseUnit: string }>(
        `/inventory/raw-materials/${id}/adjust`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },

    async getRawMaterialMovements(filters?: {
      rawMaterialId?: number;
      movementType?: string;
      limit?: number;
      offset?: number;
    }) {
      const params = new URLSearchParams();
      if (filters?.rawMaterialId) params.set("rawMaterialId", String(filters.rawMaterialId));
      if (filters?.movementType && filters.movementType !== "all") params.set("movementType", filters.movementType);
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.offset) params.set("offset", String(filters.offset));
      const q = params.toString() ? `?${params.toString()}` : "";
      return http.request<{ success: boolean; total: number; movements: RawMaterialMovement[] }>(
        `/inventory/raw-materials/movements${q}`
      );
    },

    async getRecipes() {
      return http.request<{ success: boolean; recipes: MenuItemRecipe[] }>("/inventory/recipes");
    },

    async getRecipe(menuItemId: number) {
      return http.request<{ success: boolean; menuItem: any; ingredients: RecipeIngredient[] }>(
        `/inventory/recipes/${menuItemId}`
      );
    },

    async saveRecipe(
      menuItemId: number,
      ingredients: Array<{ rawMaterialId: number; quantity: number; unit: string; notes?: string }>
    ) {
      return http.request<{ success: boolean; message: string }>(`/inventory/recipes/${menuItemId}`, {
        method: "PUT",
        body: JSON.stringify({ ingredients }),
      });
    },

    // ── Analytics ──
    async getAnalytics(range: AnalyticsRange = "7d") {
      return http.request<AnalyticsReport>(`/analytics?range=${encodeURIComponent(range)}`);
    },
  };
}

export type IrdApi = ReturnType<typeof createIrdApi>;
export const irdApi = createIrdApi();
