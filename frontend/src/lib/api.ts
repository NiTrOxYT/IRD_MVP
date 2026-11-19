// Typed API Client for Aura Resort In-Room Dining

export interface PropertySettings {
  id: number;
  name: string;
  code: string;
  currency: string;
  taxRatePercent: number;
  serviceChargePercent: number;
  irdEnabled: boolean;
  openingTime: string;
  closingTime: string;
  logoUrl: string | null;
  contactNumber: string | null;
}

export interface Room {
  id: number;
  room_number: string;
  floor: string | null;
  wing: string | null;
  is_active: boolean;
  active_stay_id?: number | null;
  guest_name?: string | null;
  stay_token?: string | null;
  qr_token: string;
  check_in_at?: string | null;
}

export interface Stay {
  id: number;
  property_id: number;
  guest_name: string;
  guest_phone: string | null;
  stay_token: string;
  check_in_at: string;
  check_out_at: string | null;
  status: "active" | "checked_out" | "revoked";
  notes: string | null;
  room_id: number;
  room_number: string;
  floor: string | null;
  wing: string | null;
  order_count?: number;
}

export interface ItemModifier {
  id: number;
  groupName: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface MenuItemVariant {
  id?: number;
  name: string;
  price: number;
  available: boolean;
  sortOrder: number;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  dietaryFlags: string[];
  available: boolean;
  sortOrder: number;
  prepTimeMinutes: number;
  modifiers: ItemModifier[];
  variants?: MenuItemVariant[];
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  is_active?: boolean;
  item_count?: number;
}

export interface OrderItem {
  id?: number;
  menuItemId: number;
  itemName: string;
  variantId?: number | null;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
  selectedModifiers: Array<{ id: number; groupName: string; name: string; priceDelta: number }>;
  lineTotal: number;
  notes?: string;
}

export interface Order {
  id: number;
  property_id: number;
  stay_id: number;
  room_id: number;
  order_number: string;
  guest_name: string;
  room_number: string;
  status: "pending" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected" | "cancelled";
  special_instructions: string | null;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  guest_order_token: string;
  created_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  items: OrderItem[];
}

export interface StaffUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleName?: string;
  roleId?: number;
  propertyId: number;
  permissions?: string[];
}

const API_BASE = "/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const stayToken = localStorage.getItem("ird_stay_token");
  const staffToken = localStorage.getItem("ird_staff_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (stayToken) {
    headers["x-stay-token"] = stayToken;
  }
  if (staffToken) {
    headers["Authorization"] = `Bearer ${staffToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data as T;
}

// ── Auth API ──
export async function loginStaff(username: string, password: string) {
  const res = await request<{ success: boolean; token: string; user: StaffUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res.token) {
    localStorage.setItem("ird_staff_token", res.token);
  }
  return res;
}

export async function logoutStaff() {
  localStorage.removeItem("ird_staff_token");
  return request<{ success: boolean }>("/auth/logout", { method: "POST" });
}

export async function getStaffMe() {
  return request<{ user: StaffUser }>("/auth/me");
}

// ── Stays API ──
export async function verifyStay(token: string) {
  const res = await request<{
    stay: {
      id: number;
      guestName: string;
      stayToken: string;
      status: string;
      checkInAt: string;
      notes: string | null;
      room: { id: number; roomNumber: string; floor: string | null; wing: string | null };
    };
    property: PropertySettings;
  }>(`/stays/verify?token=${encodeURIComponent(token)}`);
  return res;
}

export async function listStays(status?: string) {
  const url = status ? `/stays?status=${encodeURIComponent(status)}` : "/stays";
  return request<{ stays: Stay[] }>(url);
}

export async function checkinStay(data: { roomId: number; guestName: string; guestPhone?: string; notes?: string }) {
  return request<{ success: boolean; stay: Stay }>("/stays", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function checkoutStay(stayId: number) {
  return request<{ success: boolean; message: string }>(`/stays/${stayId}/checkout`, {
    method: "POST",
  });
}

export async function revokeStay(stayId: number, reason?: string) {
  return request<{ success: boolean; message: string }>(`/stays/${stayId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ── Rooms API ──
export async function listRooms() {
  return request<{ rooms: Room[] }>("/rooms");
}

export async function resolveRoomQr(qrToken: string) {
  return request<{ stayToken: string }>(`/rooms/resolve-qr/${encodeURIComponent(qrToken)}`);
}

export async function createRoom(data: { roomNumber: string; floor?: string; wing?: string }) {
  return request<{ success: boolean; room: Room }>("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Menu API ──
export async function getGuestMenu() {
  return request<{ categories: Category[]; items: MenuItem[] }>("/menu");
}

export async function getAdminMenu() {
  return request<{ categories: Category[]; items: MenuItem[] }>("/menu/admin");
}

export async function getCategories() {
  return request<{ categories: Category[] }>("/menu/categories");
}

export async function createCategory(data: { name: string; description?: string; sortOrder?: number; isActive?: boolean }) {
  return request<{ category: Category }>("/menu/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: number, data: { name?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
  return request<{ category: Category }>(`/menu/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function toggleCategoryStatus(id: number, isActive: boolean) {
  return request<{ success: boolean; category: Category }>(`/menu/categories/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export async function reorderCategories(items: Array<{ id: number; sortOrder: number }>) {
  return request<{ success: boolean; categories: Category[] }>("/menu/categories/reorder", {
    method: "PATCH",
    body: JSON.stringify({ items, orders: items }),
  });
}

export async function deleteCategory(id: number, reassignToId?: number) {
  return request<{ success: boolean }>(`/menu/categories/${id}`, {
    method: "DELETE",
    body: JSON.stringify(reassignToId ? { reassignToId } : {}),
  });
}

export async function toggleItemAvailability(itemId: number, available: boolean) {
  return request<{ success: boolean; item: { id: number; available: boolean } }>(
    `/menu/items/${itemId}/availability`,
    {
      method: "PATCH",
      body: JSON.stringify({ available }),
    }
  );
}

export async function createMenuItem(data: Partial<MenuItem>) {
  return request<{ item: MenuItem }>("/menu/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMenuItem(itemId: number, data: Partial<MenuItem>) {
  return request<{ item: MenuItem }>(`/menu/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMenuItem(itemId: number) {
  return request<{ success: boolean }>(`/menu/items/${itemId}`, { method: "DELETE" });
}

// ── Orders API ──
export async function placeOrder(data: {
  items: Array<{
    menuItemId: number;
    variantId?: number | null;
    quantity: number;
    modifierIds?: number[];
    notes?: string;
  }>;
  specialInstructions?: string;
}) {
  return request<{ success: boolean; order: Order; guestOrderToken: string }>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getStayOrders() {
  return request<{ orders: Order[] }>("/orders/stay");
}

export async function getOrder(orderId: number) {
  return request<{ order: Order }>(`/orders/${orderId}`);
}

export async function cancelGuestOrder(orderId: number) {
  return request<{ success: boolean; order: Order }>(`/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

export async function listAdminOrders(filters?: { status?: string; room?: string; date?: string }) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.room) params.set("room", filters.room);
  if (filters?.date) params.set("date", filters.date);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request<{ orders: Order[] }>(`/orders${q}`);
}

export async function updateOrderStatus(orderId: number, status: string, rejectionReason?: string) {
  return request<{ success: boolean; order: Order }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, rejectionReason }),
  });
}

// ── Kitchen KOT API ──
export async function getKitchenTickets() {
  return request<{ tickets: any[] }>("/kitchen/tickets");
}

export async function advanceKitchenTicket(ticketId: number) {
  return request<{ success: boolean; order: any }>(`/kitchen/tickets/${ticketId}/advance`, {
    method: "POST",
  });
}

// ── Settings API ──
export async function getPropertySettings() {
  return request<{ property: PropertySettings }>("/settings");
}

export async function updatePropertySettings(data: Partial<PropertySettings>) {
  return request<{ success: boolean; property: PropertySettings }>("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Audit Logs ──
export async function getAuditLogs() {
  return request<{ logs: any[] }>("/audit-logs");
}

// ── Inventory & Raw Materials API ──

export interface InventoryItem {
  id: number;
  name: string;
  price: number;
  category_id: number;
  category_name?: string;
  track_inventory: boolean;
  inventory_quantity: number;
  inventory_unit: string;
  low_stock_threshold: number;
  available: boolean;
  stock_status: "untracked" | "in_stock" | "low_stock" | "out_of_stock";
  recipe_ingredients_count?: number;
}

export interface InventorySummary {
  menuItems: {
    totalTrackedItems: number;
    totalStockOnHand: number;
    outOfStockCount: number;
    lowStockCount: number;
    byUnit: Array<{ unit: string; quantity: number }>;
  };
  rawMaterials: {
    totalItems: number;
    totalInventoryValue: number;
    outOfStockCount: number;
    lowStockCount: number;
    expiringSoonCount: number;
    byUnit: Array<{ unit: string; quantity: number }>;
  };
  alerts: Array<{
    item_type: "menu_item" | "raw_material";
    id: number;
    name: string;
    current_stock: number;
    unit: string;
    low_stock_threshold: number;
    alert_status: "low_stock" | "out_of_stock";
  }>;
}

export interface InventoryMovement {
  id: number;
  menu_item_id: number;
  menu_item_name?: string;
  category_name?: string;
  movement_type: "stock_in" | "stock_out" | "order_deduction" | "order_reversal" | "opening_stock" | "adjustment" | "wastage";
  quantity: number;
  balance_after: number;
  unit: string;
  reason: string | null;
  order_id: number | null;
  performed_by: string;
  created_at: string;
}

export interface RawMaterial {
  id: number;
  name: string;
  category: string;
  sku: string | null;
  base_unit: string;
  current_stock: number;
  low_stock_threshold: number;
  supplier: string | null;
  unit_cost: number | null;
  total_value?: number;
  batch_number: string | null;
  expiry_date: string | null;
  is_archived: boolean;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock";
  used_in_recipes_count?: number;
}

export interface RawMaterialMovement {
  id: number;
  raw_material_id: number;
  raw_material_name?: string;
  raw_material_category?: string;
  movement_type: "stock_in" | "stock_out" | "adjustment" | "recipe_consumption" | "order_reversal" | "opening_stock" | "wastage";
  quantity: number;
  unit: string;
  base_quantity: number;
  balance_before: number;
  balance_after: number;
  unit_cost: number | null;
  total_cost: number | null;
  supplier: string | null;
  invoice_ref: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  reason: string | null;
  order_id: number | null;
  performed_by: string;
  created_at: string;
}

export interface RecipeIngredient {
  id?: number;
  rawMaterialId: number;
  rawMaterialName?: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  unitCost?: number | null;
  baseUnit?: string;
  currentStock?: number;
}

export interface MenuItemRecipe {
  menu_item_id: number;
  menu_item_name: string;
  menu_item_price: number;
  category_name?: string;
  ingredients: RecipeIngredient[];
}

export async function getInventorySummary() {
  return request<{ success: boolean; summary: InventorySummary }>("/inventory/summary");
}

export async function getInventoryItems(filters?: { categoryId?: string; status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.categoryId && filters.categoryId !== "all") params.set("categoryId", filters.categoryId);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request<{ success: boolean; items: InventoryItem[] }>(`/inventory/items${q}`);
}

export async function updateInventoryItemSettings(
  id: number,
  data: { trackInventory?: boolean; inventoryQuantity?: number; inventoryUnit?: string; lowStockThreshold?: number }
) {
  return request<{ success: boolean; item: InventoryItem }>(`/inventory/items/${id}/settings`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function adjustInventoryItem(data: {
  menuItemId: number;
  movementType: "stock_in" | "stock_out" | "adjustment" | "wastage";
  quantity: number;
  reason?: string;
}) {
  return request<{ success: boolean; movement: InventoryMovement; newBalance: number }>("/inventory/items/adjust", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getInventoryMovements(filters?: {
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
  return request<{ success: boolean; total: number; movements: InventoryMovement[] }>(`/inventory/movements${q}`);
}

export async function getRawMaterials(filters?: {
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
  return request<{
    success: boolean;
    rawMaterials: RawMaterial[];
    categories: string[];
    suppliers: string[];
  }>(`/inventory/raw-materials${q}`);
}

export async function createRawMaterial(data: {
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
  return request<{ success: boolean; rawMaterial: RawMaterial }>("/inventory/raw-materials", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRawMaterial(
  id: number,
  data: Partial<RawMaterial> & {
    lowStockThreshold?: number;
    unitCost?: number;
    batchNumber?: string;
    expiryDate?: string;
    isArchived?: boolean;
  }
) {
  return request<{ success: boolean; rawMaterial: RawMaterial }>(`/inventory/raw-materials/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function adjustRawMaterial(
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
  return request<{ success: boolean; movement: RawMaterialMovement; newBalance: number; baseUnit: string }>(
    `/inventory/raw-materials/${id}/adjust`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getRawMaterialMovements(filters?: {
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
  return request<{ success: boolean; total: number; movements: RawMaterialMovement[] }>(
    `/inventory/raw-materials/movements${q}`
  );
}

export async function getRecipes() {
  return request<{ success: boolean; recipes: MenuItemRecipe[] }>("/inventory/recipes");
}

export async function getRecipe(menuItemId: number) {
  return request<{ success: boolean; menuItem: any; ingredients: RecipeIngredient[] }>(
    `/inventory/recipes/${menuItemId}`
  );
}

export async function saveRecipe(
  menuItemId: number,
  ingredients: Array<{ rawMaterialId: number; quantity: number; unit: string; notes?: string }>
) {
  return request<{ success: boolean; message: string }>(`/inventory/recipes/${menuItemId}`, {
    method: "PUT",
    body: JSON.stringify({ ingredients }),
  });
}

export type AnalyticsRange = "today" | "yesterday" | "7d" | "30d" | "thisMonth" | "prevMonth" | "all";

export interface AnalyticsReport {
  range: AnalyticsRange;
  summary: {
    orderCount: number;
    activeOrderCount: number;
    completedOrderCount: number;
    cancelledOrderCount: number;
    revenue: number;
    activeValue: number;
    cancelledValue: number;
    averageOrderValue: number;
    averageItems: number;
    completionRate: number;
    todayRevenue: number;
    yesterdayRevenue: number;
    revenueDelta: number;
    totalStays: number;
    returningStays: number;
    newStays: number;
    repeatStayRate: number;
  };
  trend: Array<{ label: string; revenue: number; orders: number }>;
  statusMix: Array<{ status: string; count: number }>;
  hourlyDemand: Array<{ hour: number; count: number }>;
  peakHour: string;
  topRooms: Array<{ room: string; orders: number; revenue: number }>;
  categories: Array<{ name: string; orders: number; revenue: number }>;
  topItems: Array<{ name: string; orders: number; quantity: number; revenue: number }>;
  highValueOrders: Array<{
    id: number;
    orderNumber: string;
    room: string;
    guestName: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
}

export async function getAnalytics(range: AnalyticsRange = "7d") {
  return request<AnalyticsReport>(`/analytics?range=${encodeURIComponent(range)}`);
}

// ── User & Role Management API ──

export interface RoleRecord {
  id: number;
  property_id: number;
  name: string;
  slug: string;
  description: string | null;
  is_builtin: boolean;
  permissions: string[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StaffUserRecord {
  id: number;
  property_id: number;
  username: string;
  full_name: string;
  role: string;
  role_id: number;
  role_name?: string;
  role_slug?: string;
  permissions?: string[];
  is_active: boolean;
  created_at: string;
}

export async function getUsers(filters?: { search?: string; roleId?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.roleId && filters.roleId !== "all") params.set("roleId", filters.roleId);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request<{ success: boolean; users: StaffUserRecord[] }>(`/users${q}`);
}

export async function createUser(data: {
  username: string;
  password: string;
  fullName: string;
  roleId: number;
}) {
  return request<{ success: boolean; user: StaffUserRecord }>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  id: number,
  data: {
    fullName?: string;
    roleId?: number;
    isActive?: boolean;
  }
) {
  return request<{ success: boolean; user: StaffUserRecord }>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function resetUserPassword(id: number, newPassword: string) {
  return request<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
}

export async function toggleUserStatus(id: number, isActive: boolean) {
  return request<{ success: boolean; message: string; isActive: boolean }>(`/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteUser(id: number) {
  return request<{ success: boolean; message: string }>(`/users/${id}`, {
    method: "DELETE",
  });
}

export async function getRoles() {
  return request<{ success: boolean; roles: RoleRecord[] }>("/users/roles");
}

export async function createRole(data: {
  name: string;
  slug?: string;
  description?: string;
  permissions: string[];
}) {
  return request<{ success: boolean; role: RoleRecord }>("/users/roles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRole(
  id: number,
  data: {
    name?: string;
    description?: string;
    permissions: string[];
  }
) {
  return request<{ success: boolean; role: RoleRecord }>(`/users/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: number) {
  return request<{ success: boolean; message: string }>(`/users/roles/${id}`, {
    method: "DELETE",
  });
}

export async function getPermissionsCatalog() {
  return request<{ success: boolean; modules: any[] }>("/users/permissions-catalog");
}

// -------------------------------------------------------------
// Housekeeping Management API
// -------------------------------------------------------------

export type HousekeepingStatus = "pending" | "accepted" | "in_progress" | "completed" | "declined";

export interface HousekeepingRequest {
  id: number;
  stay_id: number;
  room_id: number;
  room_number: string;
  guest_name: string;
  request_type: string;
  title: string;
  guest_note: string | null;
  status: HousekeepingStatus;
  assigned_staff_id: number | null;
  assigned_staff_name: string | null;
  staff_notes: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
}

export interface HousekeepingSummary {
  pendingCount: number;
  inProgressCount: number;
  completedTodayCount: number;
}

export async function getGuestHousekeepingRequests() {
  return request<{ success: boolean; requests: HousekeepingRequest[] }>("/housekeeping/guest");
}

export async function createGuestHousekeepingRequest(data: { requestType: string; guestNote?: string }) {
  return request<{ success: boolean; request: HousekeepingRequest; message: string }>("/housekeeping/guest", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getStaffHousekeepingRequests(filters?: { status?: string; room?: string; requestType?: string }) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.room) params.set("room", filters.room);
  if (filters?.requestType && filters.requestType !== "all") params.set("requestType", filters.requestType);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request<{ success: boolean; requests: HousekeepingRequest[] }>(`/housekeeping${q}`);
}

export async function updateHousekeepingStatus(id: number, data: { status: string; staffNotes?: string }) {
  return request<{ success: boolean; request: HousekeepingRequest; message: string }>(`/housekeeping/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getHousekeepingSummary() {
  return request<{ success: boolean; summary: HousekeepingSummary }>("/housekeeping/summary");
}
