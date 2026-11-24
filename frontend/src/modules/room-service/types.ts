import type { LucideIcon } from "lucide-react";

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
  activeCount?: number;
}

export interface RoomServiceCatalogItem {
  type: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  badge: string;
}

export interface RoomServiceHttpClient {
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}

export interface RoomServiceRealtimeClient {
  on(event: string, listener: (...args: any[]) => void): () => void;
  emit(event: string, ...args: any[]): void;
  isConnected(): boolean;
  registerReconnectHook(fn: (client: RoomServiceRealtimeClient) => void): () => void;
}
