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
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "rejected"
    | "cancelled";
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

export interface CartLineItem {
  cartItemId: string;
  item: MenuItem;
  variantId?: number | null;
  variantName?: string | null;
  quantity: number;
  selectedModifiers: ItemModifier[];
  notes?: string;
  unitPrice: number;
  lineTotal: number;
}

export interface IrdPropertyConfig {
  name?: string;
  currency?: string;
  taxRatePercent?: number;
  serviceChargePercent?: number;
  irdEnabled?: boolean;
  openingTime?: string;
  closingTime?: string;
  diningHeroUrl?: string | null;
}

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
  movement_type:
    | "stock_in"
    | "stock_out"
    | "order_deduction"
    | "order_reversal"
    | "opening_stock"
    | "adjustment"
    | "wastage";
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
  movement_type:
    | "stock_in"
    | "stock_out"
    | "adjustment"
    | "recipe_consumption"
    | "order_reversal"
    | "opening_stock"
    | "wastage";
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
  ingredientCost?: number | null;
}

export interface MenuItemRecipe {
  menu_item_id: number;
  menu_item_name: string;
  menu_item_price: number;
  category_name?: string;
  ingredients: RecipeIngredient[];
  totalPlateCost?: number;
}

export type AnalyticsRange =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "thisMonth"
  | "prevMonth"
  | "all";

export interface AnalyticsReport {
  range: AnalyticsRange;
  summary: {
    orderCount: number;
    billableOrderCount: number;
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
    revenueDelta: number | null;
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

export interface IrdHttpClient {
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}

export interface IrdRealtimeClient {
  on(event: string, listener: (...args: any[]) => void): () => void;
  emit(event: string, ...args: any[]): void;
  isConnected(): boolean;
  registerReconnectHook(fn: (client: IrdRealtimeClient) => void): () => void;
}
