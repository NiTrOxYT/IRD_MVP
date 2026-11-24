import { realtimeClient } from "../../core/transport/realtimeClient";
import type { HousekeepingRequest, RoomServiceRealtimeClient } from "./types";

export function createRoomServiceRealtime(client: RoomServiceRealtimeClient = realtimeClient) {
  let activeHousekeepingSubscription = false;
  let reconnectRegistered = false;

  return {
    joinHousekeepingRoom(token?: string) {
      activeHousekeepingSubscription = true;
      if (!reconnectRegistered) {
        reconnectRegistered = true;
        client.registerReconnectHook((c) => {
          if (activeHousekeepingSubscription) {
            c.emit("join:housekeeping");
          }
        });
      }
      client.emit("join:housekeeping", { token });
    },

    onHousekeepingCreated(callback: (request: HousekeepingRequest) => void): () => void {
      return client.on("housekeeping:created", callback);
    },

    onHousekeepingStatusChanged(
      callback: (data: { request: HousekeepingRequest; previousStatus: string }) => void
    ): () => void {
      return client.on("housekeeping:status_changed", callback);
    },
  };
}

export type RoomServiceRealtime = ReturnType<typeof createRoomServiceRealtime>;
export const roomServiceRealtime = createRoomServiceRealtime();
