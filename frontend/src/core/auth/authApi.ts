import { httpClient, type HttpClient } from "../transport/httpClient";
import type { RoleRecord, StaffUser, StaffUserRecord } from "./authTypes";

export function createCoreAuthApi(http: HttpClient = httpClient) {
  return {
    async loginStaff(username: string, password: string) {
      const res = await http.request<{ success: boolean; token: string; user: StaffUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res.token && typeof localStorage !== "undefined") {
        localStorage.setItem("ird_staff_token", res.token);
      }
      return res;
    },

    async logoutStaff() {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("ird_staff_token");
      }
      return http.request<{ success: boolean }>("/auth/logout", { method: "POST" });
    },

    async getStaffMe() {
      return http.request<{ user: StaffUser }>("/auth/me");
    },

    async getUsers(filters?: { search?: string; roleId?: string; status?: string }) {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.roleId && filters.roleId !== "all") params.set("roleId", filters.roleId);
      if (filters?.status && filters.status !== "all") params.set("status", filters.status);
      const q = params.toString() ? `?${params.toString()}` : "";
      return http.request<{ success: boolean; users: StaffUserRecord[] }>(`/users${q}`);
    },

    async createUser(data: { username: string; password: string; fullName: string; roleId: number }) {
      return http.request<{ success: boolean; user: StaffUserRecord }>("/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateUser(id: number, data: { fullName?: string; roleId?: number; isActive?: boolean }) {
      return http.request<{ success: boolean; user: StaffUserRecord }>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async resetUserPassword(id: number, newPassword: string) {
      return http.request<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
    },

    async toggleUserStatus(id: number, isActive: boolean) {
      return http.request<{ success: boolean; message: string; isActive: boolean }>(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },

    async deleteUser(id: number) {
      return http.request<{ success: boolean; message: string }>(`/users/${id}`, {
        method: "DELETE",
      });
    },

    async getRoles() {
      return http.request<{ success: boolean; roles: RoleRecord[] }>("/users/roles");
    },

    async createRole(data: { name: string; slug?: string; description?: string; permissions: string[] }) {
      return http.request<{ success: boolean; role: RoleRecord }>("/users/roles", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateRole(id: number, data: { name?: string; description?: string; permissions: string[] }) {
      return http.request<{ success: boolean; role: RoleRecord }>(`/users/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async deleteRole(id: number) {
      return http.request<{ success: boolean; message: string }>(`/users/roles/${id}`, {
        method: "DELETE",
      });
    },

    async getPermissionsCatalog() {
      return http.request<{ success: boolean; modules: any[] }>("/users/permissions-catalog");
    },
  };
}

export const coreAuthApi = createCoreAuthApi();
export const {
  loginStaff,
  logoutStaff,
  getStaffMe,
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
  deleteUser,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissionsCatalog,
} = coreAuthApi;
