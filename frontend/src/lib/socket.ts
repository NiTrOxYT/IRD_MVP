import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let activeAdminSubscription = false;
let activeKitchenSubscription = false;
let activeStayId: number | null = null;
const activeOrderSubscriptions = new Set<number>();
const connectionListeners = new Set<(status: "connected" | "reconnecting" | "disconnected") => void>();

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/socket.io/",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
    });

    socket.on("connect", () => {
      notifyConnectionChange("connected");

      if (activeAdminSubscription) {
        socket?.emit("join:admin");
      }
      if (activeKitchenSubscription) {
        socket?.emit("join:kitchen");
      }
      if (activeStayId) {
        socket?.emit("join:stay", { stayId: activeStayId });
      }
      activeOrderSubscriptions.forEach((orderId) => {
        socket?.emit("join:order", { orderId });
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
}

function notifyConnectionChange(status: "connected" | "reconnecting" | "disconnected") {
  connectionListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeConnectionStatus(callback: (status: "connected" | "reconnecting" | "disconnected") => void): () => void {
  connectionListeners.add(callback);
  // initial invoke
  if (socket?.connected) {
    callback("connected");
  } else {
    callback("reconnecting");
  }
  return () => {
    connectionListeners.delete(callback);
  };
}

export function joinAdminRoom(token?: string) {
  activeAdminSubscription = true;
  const s = getSocket();
  if (s.connected) {
    s.emit("join:admin", { token });
  }
}

export function joinKitchenRoom(token?: string) {
  activeKitchenSubscription = true;
  const s = getSocket();
  if (s.connected) {
    s.emit("join:kitchen", { token });
  }
}

export function joinStayRoom(stayId: number) {
  activeStayId = stayId;
  const s = getSocket();
  if (s.connected) {
    s.emit("join:stay", { stayId });
  }
}

export function joinOrderRoom(orderId: number) {
  activeOrderSubscriptions.add(orderId);
  const s = getSocket();
  if (s.connected) {
    s.emit("join:order", { orderId });
  }
}

export function onOrderCreated(callback: (order: any) => void): () => void {
  const s = getSocket();
  s.on("order:created", callback);
  return () => {
    s.off("order:created", callback);
  };
}

export function onOrderStatusChanged(callback: (data: { order: any; previousStatus: string }) => void): () => void {
  const s = getSocket();
  s.on("order:status_changed", callback);
  return () => {
    s.off("order:status_changed", callback);
  };
}

export function onStayInvalidated(callback: (data: { stayId: number; message: string }) => void): () => void {
  const s = getSocket();
  s.on("stay:invalidated", callback);
  return () => {
    s.off("stay:invalidated", callback);
  };
}

export function onStayCreated(callback: (stay: any) => void): () => void {
  const s = getSocket();
  s.on("stay:created", callback);
  return () => {
    s.off("stay:created", callback);
  };
}
