import { io, Socket } from "socket.io-client";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export interface RealtimeClient {
  on(event: string, listener: (...args: any[]) => void): () => void;
  emit(event: string, ...args: any[]): void;
  isConnected(): boolean;
  registerReconnectHook(fn: (client: RealtimeClient) => void): () => void;
  subscribeConnectionStatus(callback: (status: ConnectionStatus) => void): () => void;
}

export interface RealtimeClientConfig {
  url?: string;
  path?: string;
  withCredentials?: boolean;
}

export function createRealtimeClient(config: RealtimeClientConfig = {}): RealtimeClient {
  let socket: Socket | null = null;
  const connectionListeners = new Set<(status: ConnectionStatus) => void>();
  const reconnectHooks = new Set<(client: RealtimeClient) => void>();

  const notifyConnectionChange = (status: ConnectionStatus) => {
    connectionListeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.error(e);
      }
    });
  };

  const getSocket = (): Socket => {
    if (!socket) {
      const envUrl = (import.meta as any).env?.VITE_SOCKET_URL as string | undefined;
      const envPath = (import.meta as any).env?.VITE_SOCKET_PATH as string | undefined;
      const targetUrl = config.url ?? envUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
      const targetPath = config.path ?? envPath ?? "/socket.io/";

      socket = io(targetUrl, {
        path: targetPath,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        withCredentials: config.withCredentials ?? true,
      });

      socket.on("connect", () => {
        notifyConnectionChange("connected");
        reconnectHooks.forEach((hook) => {
          try {
            hook(client);
          } catch (e) {
            console.error(e);
          }
        });
      });

      socket.on("reconnect_attempt", () => {
        notifyConnectionChange("reconnecting");
      });

      socket.on("disconnect", () => {
        notifyConnectionChange("disconnected");
      });

      socket.on("connect_error", () => {
        notifyConnectionChange("reconnecting");
      });
    }
    return socket;
  };

  const client: RealtimeClient = {
    on(event: string, listener: (...args: any[]) => void): () => void {
      const s = getSocket();
      s.on(event, listener);
      return () => {
        s.off(event, listener);
      };
    },
    emit(event: string, ...args: any[]): void {
      const s = getSocket();
      if (s.connected) {
        s.emit(event, ...args);
      }
    },
    isConnected(): boolean {
      return Boolean(socket?.connected);
    },
    registerReconnectHook(fn: (c: RealtimeClient) => void): () => void {
      reconnectHooks.add(fn);
      return () => reconnectHooks.delete(fn);
    },
    subscribeConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
      connectionListeners.add(callback);
      callback(socket?.connected ? "connected" : "reconnecting");
      return () => {
        connectionListeners.delete(callback);
      };
    },
  };

  return client;
}

export const realtimeClient = createRealtimeClient();

let activeStayId: number | null = null;
let stayReconnectRegistered = false;

export function joinStayRoom(stayId: number, client: RealtimeClient = realtimeClient) {
  activeStayId = stayId;
  if (!stayReconnectRegistered) {
    stayReconnectRegistered = true;
    client.registerReconnectHook((c) => {
      if (activeStayId) c.emit("join:stay", { stayId: activeStayId });
    });
  }
  client.emit("join:stay", { stayId });
}

export function onStayInvalidated(
  callback: (data: { stayId: number; message: string }) => void,
  client: RealtimeClient = realtimeClient
): () => void {
  return client.on("stay:invalidated", callback);
}

export function onStayCreated(
  callback: (stay: any) => void,
  client: RealtimeClient = realtimeClient
): () => void {
  return client.on("stay:created", callback);
}

export function subscribeConnectionStatus(
  callback: (status: ConnectionStatus) => void,
  client: RealtimeClient = realtimeClient
): () => void {
  return client.subscribeConnectionStatus(callback);
}
