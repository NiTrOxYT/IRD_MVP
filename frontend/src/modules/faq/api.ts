import { httpClient } from "../../core/transport/httpClient";
import type { FaqHttpClient, FaqItem, FaqPayload } from "./types";

export function createFaqApi(http: FaqHttpClient = httpClient) {
  return {
    async getGuestFaqs() {
      return http.request<{ success: boolean; faqs: FaqItem[] }>("/faq/guest");
    },

    async listAdminFaqs() {
      return http.request<{ success: boolean; faqs: FaqItem[] }>("/faq");
    },

    async createFaq(data: FaqPayload) {
      return http.request<{ success: boolean; faq: FaqItem }>("/faq", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateFaq(id: number, data: FaqPayload) {
      return http.request<{ success: boolean; faq: FaqItem }>(`/faq/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async toggleFaqStatus(id: number, isActive: boolean) {
      return http.request<{ success: boolean; faq: FaqItem }>(`/faq/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },

    async deleteFaq(id: number) {
      return http.request<{ success: boolean; message: string }>(`/faq/${id}`, {
        method: "DELETE",
      });
    },
  };
}

export type FaqApi = ReturnType<typeof createFaqApi>;
export const faqApi = createFaqApi();
