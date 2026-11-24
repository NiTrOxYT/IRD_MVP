import { httpClient } from "../../core/transport/httpClient";
import type { AttractionsHttpClient, LocalAttraction, LocalAttractionPayload } from "./types";

export function createAttractionsApi(http: AttractionsHttpClient = httpClient) {
  return {
    async getGuestAttractions() {
      return http.request<{ success: boolean; attractions: LocalAttraction[] }>("/attractions/guest");
    },

    async listAdminAttractions() {
      return http.request<{ success: boolean; attractions: LocalAttraction[] }>("/attractions");
    },

    async createAttraction(data: LocalAttractionPayload) {
      return http.request<{ success: boolean; attraction: LocalAttraction }>("/attractions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateAttraction(id: number, data: LocalAttractionPayload) {
      return http.request<{ success: boolean; attraction: LocalAttraction }>(`/attractions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async toggleAttractionStatus(id: number, data: { isActive?: boolean; isFeatured?: boolean }) {
      return http.request<{ success: boolean; attraction: LocalAttraction }>(`/attractions/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    async deleteAttraction(id: number) {
      return http.request<{ success: boolean; message: string }>(`/attractions/${id}`, {
        method: "DELETE",
      });
    },
  };
}

export type AttractionsApi = ReturnType<typeof createAttractionsApi>;
export const attractionsApi = createAttractionsApi();
