import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import cookie from "cookie";
import { verifyStaffToken } from "./lib/auth.js";
import { hasPermission } from "./lib/permissions.js";
import { query } from "./db/index.js";

let io: SocketIOServer | null = null;

export function initSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io/",
  });

  io.on("connection", (socket: Socket) => {
    // 1. Join Admin/Reception Room
    socket.on("join:admin", () => {
      const rawCookie = socket.handshake.headers.cookie;
      let token = "";
      if (rawCookie) {
        const parsed = cookie.parse(rawCookie);
        token = parsed.staff_session;
      }
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (token) {
        const payload = verifyStaffToken(token);
        if (payload && (payload.role === "admin" || payload.role === "staff")) {
          socket.join("admin");
          socket.emit("joined:admin", { success: true, role: payload.role });
          return;
        }
      }
      socket.emit("error", { message: "Unauthorized admin session" });
    });

    // 2. Join Kitchen Display Room
    socket.on("join:kitchen", () => {
      const rawCookie = socket.handshake.headers.cookie;
      let token = "";
      if (rawCookie) {
        const parsed = cookie.parse(rawCookie);
        token = parsed.staff_session;
      }
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (token) {
        const payload = verifyStaffToken(token);
        if (payload && (payload.role === "kitchen" || payload.role === "admin")) {
          socket.join("kitchen");
          socket.emit("joined:kitchen", { success: true });
          return;
        }
      }
      socket.emit("error", { message: "Unauthorized kitchen session" });
    });

    // 2b. Join Housekeeping Console Room
    socket.on("join:housekeeping", async () => {
      const rawCookie = socket.handshake.headers.cookie;
      let token = "";
      if (rawCookie) {
        const parsed = cookie.parse(rawCookie);
        token = parsed.staff_session;
      }
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (token) {
        const payload = verifyStaffToken(token);
        if (payload) {
          try {
            const userRes = await query(
              `SELECT u.property_id, u.is_active, u.token_version, u.role,
                      r.slug AS role_slug, r.permissions
               FROM staff_users u
               LEFT JOIN roles r ON r.id = u.role_id
               WHERE u.id = $1`,
              [payload.id]
            );
            const user = userRes.rows[0];
            let permissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
            if (typeof user?.permissions === "string") {
              try { permissions = JSON.parse(user.permissions); } catch { permissions = []; }
            }
            if (user?.role === "admin" || user?.role_slug === "admin") permissions = ["*", ...permissions];
            const sessionIsCurrent = payload.tokenVersion === undefined || user?.token_version === payload.tokenVersion;
            if (user?.is_active && sessionIsCurrent && hasPermission(permissions, "housekeeping:view")) {
              socket.join(`housekeeping:${user.property_id}`);
              socket.emit("joined:housekeeping", { success: true });
              return;
            }
          } catch (error) {
            console.error("[Socket] Housekeeping authorization failed:", error);
          }
        }
      }
      socket.emit("error", { message: "Unauthorized housekeeping session" });
    });

    // 3. Join Stay Room (For guest devices in the room)
    socket.on("join:stay", ({ stayId }: { stayId: number | string }) => {
      if (stayId) {
        socket.join(`stay:${stayId}`);
        socket.emit("joined:stay", { stayId });
      }
    });

    // 4. Join Specific Order Room
    socket.on("join:order", ({ orderId }: { orderId: number | string }) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        socket.emit("joined:order", { orderId });
      }
    });

    socket.on("disconnect", () => {
      // socket disconnected cleanly
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastOrderCreated(order: any) {
  if (!io) return;
  // Notify admin
  io.to("admin").emit("order:created", order);
  // Notify stay
  io.to(`stay:${order.stay_id || order.stayId}`).emit("order:created", order);
}

export function broadcastOrderStatusChanged(order: any, previousStatus: string) {
  if (!io) return;
  const stayId = order.stay_id || order.stayId;
  const orderId = order.id;

  // Broadcast to admin
  io.to("admin").emit("order:status_changed", { order, previousStatus });

  // Broadcast to kitchen if order is relevant to kitchen
  // (accepted, preparing, ready, cancelled)
  io.to("kitchen").emit("order:status_changed", { order, previousStatus });

  // Broadcast to stay room (all guest devices in that room)
  io.to(`stay:${stayId}`).emit("order:status_changed", { order, previousStatus });

  // Broadcast to specific order room
  io.to(`order:${orderId}`).emit("order:status_changed", { order, previousStatus });
}

export function broadcastStayInvalidated(stayId: number) {
  if (!io) return;
  io.to(`stay:${stayId}`).emit("stay:invalidated", {
    stayId,
    message: "Room access has expired or was checked out by reception.",
  });
  io.to("admin").emit("stay:checked_out", { stayId });
}

export function broadcastStayCreated(stay: any) {
  if (!io) return;
  io.to("admin").emit("stay:created", stay);
}

export function broadcastHousekeepingCreated(request: any) {
  if (!io) return;
  io.to(`housekeeping:${request.property_id || request.propertyId}`).emit("housekeeping:created", request);
}

export function broadcastHousekeepingStatusChanged(request: any, previousStatus: string) {
  if (!io) return;
  io.to(`housekeeping:${request.property_id || request.propertyId}`).emit("housekeeping:status_changed", { request, previousStatus });
}
