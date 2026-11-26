import { httpClient } from "../../core/transport/httpClient";
import type { CreateInboxMessagePayload, GuestInboxMessage } from "./types";

export const inboxApi = {
  async getGuestMessages() {
    return httpClient.request<{
      success: boolean;
      messages: GuestInboxMessage[];
      unreadCount: number;
    }>("/inbox/guest");
  },

  async markMessageRead(id: number) {
    return httpClient.request<{ success: boolean }>(`/inbox/guest/${id}/read`, {
      method: "POST",
    });
  },

  async markAllRead() {
    return httpClient.request<{ success: boolean }>("/inbox/guest/read-all", {
      method: "POST",
    });
  },

  async listAdminMessages() {
    return httpClient.request<{
      success: boolean;
      messages: GuestInboxMessage[];
    }>("/inbox");
  },

  async sendMessage(payload: CreateInboxMessagePayload) {
    return httpClient.request<{
      success: boolean;
      message: GuestInboxMessage;
    }>("/inbox", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async toggleMessageStatus(id: number, isActive: boolean) {
    return httpClient.request<{
      success: boolean;
      message: GuestInboxMessage;
    }>(`/inbox/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },

  async deleteMessage(id: number) {
    return httpClient.request<{ success: boolean; message: string }>(`/inbox/${id}`, {
      method: "DELETE",
    });
  },
};
