import type { RequestHandler } from "express";
import type { Router } from "express";
import type { Socket } from "socket.io";

export interface DbPoolClient {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
  release(): void;
}

export interface DbAdapter {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
  connect(): Promise<DbPoolClient>;
}

export type RoomJoinHandler = (
  socket: Socket,
  payload: any,
  helpers: { extractToken: (socket: Socket) => string }
) => void | Promise<void>;

export interface RealtimeAdapter {
  emitToRoom(room: string, event: string, payload: unknown): void;
  registerRoomHandler(event: string, handler: RoomJoinHandler): void;
}

export type RequireStaffOptions =
  | string
  | string[]
  | {
      permission?: string;
      permissions?: string[];
      roles?: string[];
    };

export interface StaffPayload {
  id: number;
  username: string;
  role: string;
  roleId?: number;
  propertyId: number;
  tokenVersion?: number;
}

export interface AuthGuards {
  requireStaff: (options?: RequireStaffOptions) => RequestHandler;
  requirePermission: (permission: string) => RequestHandler;
  requireActiveStay: RequestHandler;
  verifyStaffToken: (token: string) => StaffPayload | null;
  hasPermission: (userPermissions: string[] | undefined | null, requiredPermission: string) => boolean;
}

export interface ModuleConfig {
  jwtSecret?: string;
}

export interface ModuleDeps {
  db: DbAdapter;
  auth: AuthGuards;
  realtime: RealtimeAdapter;
  config?: ModuleConfig;
}

export type PermissionAction = "view" | "create" | "edit" | "delete" | "manage";

export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  actions: readonly PermissionAction[];
}

export interface BackendFeatureModule {
  id: string;
  name: string;
  permissions: PermissionModule[];
  router: Router;
  registerRealtime: () => void;
}
