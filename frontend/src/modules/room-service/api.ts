import { httpClient } from "../../core/transport/httpClient";
import type { HousekeepingRequest, HousekeepingSummary, RoomServiceHttpClient } from "./types";

export function createRoomServiceApi(http: RoomServiceHttpClient = httpClient) {
  return {
    async getGuestHousekeepingRequests() {
      return http.request<{ success: boolean; requests: HousekeepingRequest[] }>("/housekeeping/guest");
    },

    async createGuestHousekeepingRequest(data: { requestType: string; guestNote?: string }) {
      return http.request<{ success: boolean; request: HousekeepingRequest; message: string }>(
        "/housekeeping/guest",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },

    async getStaffHousekeepingRequests(filters?: { status?: string; room?: string; requestType?: string }) {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== "all") params.set("status", filters.status);
      if (filters?.room) params.set("room", filters.room);
      if (filters?.requestType && filters.requestType !== "all") params.set("requestType", filters.requestType);
      const q = params.toString() ? `?${params.toString()}` : "";
      return http.request<{ success: boolean; requests: HousekeepingRequest[] }>(`/housekeeping${q}`);
    },

    async updateHousekeepingStatus(id: number, data: { status: string; staffNotes?: string }) {
      return http.request<{ success: boolean; request: HousekeepingRequest; message: string }>(
        `/housekeeping/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
    },

    async getHousekeepingSummary() {
      return http.request<{ success: boolean; summary: HousekeepingSummary }>("/housekeeping/summary");
    },
  };
}

export type RoomServiceApi = ReturnType<typeof createRoomServiceApi>;
export const roomServiceApi = createRoomServiceApi();
