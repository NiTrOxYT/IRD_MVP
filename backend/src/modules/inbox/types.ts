import type { AuthGuards, DbAdapter, RealtimeAdapter } from "../../core/module.js";

export type InboxModuleDeps = {
  db: DbAdapter;
  auth: Pick<AuthGuards, "requireStaff" | "requireActiveStay">;
  realtime: Pick<RealtimeAdapter, "emitToRoom">;
};

export interface GuestInboxMessageDTO {
  id: number;
  propertyId: number;
  title: string;
  body: string;
  category: string;
  targetType: "all" | "rooms";
  targetRoomIds: number[];
  targetRoomNumbers: string[];
  createdByName: string | null;
  isActive: boolean;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  readCount?: number;
}
