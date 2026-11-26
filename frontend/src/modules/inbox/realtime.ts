import { realtimeClient } from "../../core/transport/realtimeClient";
import type { GuestInboxMessage } from "./types";

export const inboxRealtime = {
  onMessageReceived(callback: (message: GuestInboxMessage) => void): () => void {
    return realtimeClient.on("inbox:message", callback);
  },
};
