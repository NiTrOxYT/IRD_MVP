import { httpClient, type HttpClient } from "../transport/httpClient";
import type { PropertySettings, Room, Stay, VerifiedStaySession } from "./propertyTypes";

export function createCorePropertyApi(http: HttpClient = httpClient) {
  return {
    async verifyStay(token: string) {
      return http.request<{
        stay: VerifiedStaySession;
        property: PropertySettings;
      }>(`/stays/verify?token=${encodeURIComponent(token)}`);
    },

    async listStays(status?: string) {
      const url = status ? `/stays?status=${encodeURIComponent(status)}` : "/stays";
      return http.request<{ stays: Stay[] }>(url);
    },

    async checkinStay(data: { roomId: number; guestName: string; guestPhone?: string; notes?: string }) {
      return http.request<{ success: boolean; stay: Stay }>("/stays", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async checkoutStay(stayId: number) {
      return http.request<{ success: boolean; message: string }>(`/stays/${stayId}/checkout`, {
        method: "POST",
      });
    },

    async revokeStay(stayId: number, reason?: string) {
      return http.request<{ success: boolean; message: string }>(`/stays/${stayId}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },

    async listRooms() {
      return http.request<{ rooms: Room[] }>("/rooms");
    },

    async resolveRoomQr(qrToken: string) {
      return http.request<{ stayToken: string }>(`/rooms/resolve-qr/${encodeURIComponent(qrToken)}`);
    },

    async createRoom(data: { roomNumber: string; floor?: string; wing?: string }) {
      return http.request<{ success: boolean; room: Room }>("/rooms", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getPropertySettings() {
      return http.request<{ property: PropertySettings }>("/settings");
    },

    async updatePropertySettings(data: Partial<PropertySettings>) {
      return http.request<{ success: boolean; property: PropertySettings }>("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async getAuditLogs() {
      return http.request<{ logs: any[] }>("/audit-logs");
    },
  };
}

export const corePropertyApi = createCorePropertyApi();
export const {
  verifyStay,
  listStays,
  checkinStay,
  checkoutStay,
  revokeStay,
  listRooms,
  resolveRoomQr,
  createRoom,
  getPropertySettings,
  updatePropertySettings,
  getAuditLogs,
} = corePropertyApi;
