import type { RequestHandler } from "express";
import type { Socket } from "socket.io";

export interface DbPoolClient {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
  release(): void;
}

export interface DbAdapter {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
  connect(): Promise<DbPoolClient>;
}

export interface RealtimeAdapter {
  emitToRoom(room: string, event: string, payload: unknown): void;
  registerRoomHandler(
    event: string,
    handler: (
      socket: Socket,
      payload: any,
      helpers: { extractToken: (socket: Socket) => string }
    ) => void | Promise<void>
  ): void;
}

export interface StaffPayload {
  id: number;
  username: string;
  role: string;
  roleId?: number;
  propertyId: number;
  tokenVersion?: number;
}

export interface AuthGuards {
  requireStaff: (options?: string | string[] | { permission?: string; permissions?: string[]; roles?: string[] }) => RequestHandler;
  requireActiveStay: RequestHandler;
  verifyStaffToken: (token: string) => StaffPayload | null;
  hasPermission: (userPermissions: string[] | undefined | null, requiredPermission: string) => boolean;
}

export interface RoomServiceModuleDeps {
  db: DbAdapter;
  auth: AuthGuards;
  realtime: RealtimeAdapter;
}
