import type { IrdModuleDeps } from "./types.js";

export function registerIrdRealtime(deps: IrdModuleDeps): void {
  const { auth, realtime } = deps;

  realtime.registerRoomHandler("join:admin", (socket, payload, helpers) => {
    const token = helpers.extractToken(socket) || (payload?.token ? String(payload.token) : "");
    if (token) {
      const verified = auth.verifyStaffToken(token);
      if (verified && (verified.role === "admin" || verified.role === "staff")) {
        socket.join("admin");
        socket.emit("joined:admin", { success: true, role: verified.role });
        return;
      }
    }
    socket.emit("error", { message: "Unauthorized admin session" });
  });

  realtime.registerRoomHandler("join:kitchen", (socket, payload, helpers) => {
    const token = helpers.extractToken(socket) || (payload?.token ? String(payload.token) : "");
    if (token) {
      const verified = auth.verifyStaffToken(token);
      if (verified && (verified.role === "kitchen" || verified.role === "admin")) {
        socket.join("kitchen");
        socket.emit("joined:kitchen", { success: true });
        return;
      }
    }
    socket.emit("error", { message: "Unauthorized kitchen session" });
  });

  realtime.registerRoomHandler("join:order", (socket, payload) => {
    const orderId = payload?.orderId;
    if (orderId) {
      socket.join(`order:${orderId}`);
      socket.emit("joined:order", { orderId });
    }
  });
}

export function createIrdBroadcasters(deps: Pick<IrdModuleDeps, "realtime">) {
  const { realtime } = deps;

  return {
    broadcastOrderCreated(order: any) {
      realtime.emitToRoom("admin", "order:created", order);
      realtime.emitToRoom(`stay:${order.stay_id || order.stayId}`, "order:created", order);
    },

    broadcastOrderStatusChanged(order: any, previousStatus: string) {
      const stayId = order.stay_id || order.stayId;
      const orderId = order.id;

      realtime.emitToRoom("admin", "order:status_changed", { order, previousStatus });
      realtime.emitToRoom("kitchen", "order:status_changed", { order, previousStatus });
      realtime.emitToRoom(`stay:${stayId}`, "order:status_changed", { order, previousStatus });
      realtime.emitToRoom(`order:${orderId}`, "order:status_changed", { order, previousStatus });
    },
  };
}
