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
  guest_pin?: string | null;
  check_in_at?: string | null;
}

export interface Stay {
  id: number;
  property_id: number;
  guest_name: string;
  guest_phone: string | null;
  guest_pin: string;
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
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface OrderItem {
  id?: number;
  menuItemId: number;
  itemName: string;
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
  role: "admin" | "staff" | "kitchen";
  propertyId: number;
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
      guestPin: string;
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

export async function lookupStayByPin(roomNumber: string, pin: string) {
  return request<{ stayToken: string }>("/stays/lookup-pin", {
    method: "POST",
    body: JSON.stringify({ roomNumber, pin }),
  });
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

export async function deleteMenuItem(itemId: number) {
  return request<{ success: boolean }>(`/menu/items/${itemId}`, { method: "DELETE" });
}

// ── Orders API ──
export async function placeOrder(data: {
  items: Array<{ menuItemId: number; quantity: number; modifierIds?: number[]; notes?: string }>;
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
