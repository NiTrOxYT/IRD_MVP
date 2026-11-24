import { realtimeClient } from "../../core/transport/realtimeClient";
import type { IrdRealtimeClient } from "./types";

export function createIrdRealtime(client: IrdRealtimeClient = realtimeClient) {
  let activeAdminSubscription = false;
  let activeKitchenSubscription = false;
  const activeOrderSubscriptions = new Set<number>();
  let reconnectRegistered = false;

  const ensureReconnectHook = () => {
    if (reconnectRegistered) return;
    reconnectRegistered = true;
    client.registerReconnectHook((c) => {
      if (activeAdminSubscription) c.emit("join:admin");
      if (activeKitchenSubscription) c.emit("join:kitchen");
      activeOrderSubscriptions.forEach((orderId) => c.emit("join:order", { orderId }));
    });
  };

  return {
    joinAdminRoom(token?: string) {
      activeAdminSubscription = true;
      ensureReconnectHook();
      client.emit("join:admin", { token });
    },

    joinKitchenRoom(token?: string) {
      activeKitchenSubscription = true;
      ensureReconnectHook();
      client.emit("join:kitchen", { token });
    },

    joinOrderRoom(orderId: number) {
      activeOrderSubscriptions.add(orderId);
      ensureReconnectHook();
      client.emit("join:order", { orderId });
    },

    onOrderCreated(callback: (order: any) => void): () => void {
      return client.on("order:created", callback);
    },

    onOrderStatusChanged(callback: (data: { order: any; previousStatus: string }) => void): () => void {
      return client.on("order:status_changed", callback);
    },
  };
}

export type IrdRealtime = ReturnType<typeof createIrdRealtime>;
export const irdRealtime = createIrdRealtime();
