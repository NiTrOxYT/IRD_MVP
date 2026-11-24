import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import cookie from "cookie";
import type { RealtimeAdapter, RoomJoinHandler } from "../module.js";

function extractSocketToken(socket: Socket): string {
  const rawCookie = socket.handshake.headers.cookie;
  let token = "";
  if (rawCookie) {
    const parsed = cookie.parse(rawCookie);
    token = parsed.staff_session || "";
  }
  if (!token && socket.handshake.auth?.token) {
    token = String(socket.handshake.auth.token);
  }
  return token;
}

export interface SocketGateway extends RealtimeAdapter {
  init(server: HTTPServer, corsOrigin?: string | string[] | boolean): SocketIOServer;
  getIO(): SocketIOServer | null;
}

export function createSocketGateway(): SocketGateway {
  let io: SocketIOServer | null = null;
  const roomHandlers = new Map<string, RoomJoinHandler>();

  // Core stay room handler
  roomHandlers.set("join:stay", (socket, payload) => {
    const stayId = payload?.stayId;
    if (stayId) {
      socket.join(`stay:${stayId}`);
      socket.emit("joined:stay", { stayId });
    }
  });

  return {
    init(server: HTTPServer, corsOrigin?: string | string[] | boolean): SocketIOServer {
      io = new SocketIOServer(server, {
        cors: {
          origin: corsOrigin ?? "*",
          methods: ["GET", "POST"],
          credentials: true,
        },
        path: process.env.SOCKET_PATH || "/socket.io/",
      });

      io.on("connection", (socket: Socket) => {
        for (const [event, handler] of roomHandlers.entries()) {
          socket.on(event, (payload: any) => handler(socket, payload, { extractToken: extractSocketToken }));
        }

        socket.on("disconnect", () => {
          // socket disconnected cleanly
        });
      });

      return io;
    },

    getIO(): SocketIOServer | null {
      return io;
    },

    emitToRoom(room: string, event: string, payload: unknown): void {
      if (!io) return;
      io.to(room).emit(event, payload);
    },

    registerRoomHandler(event: string, handler: RoomJoinHandler): void {
      roomHandlers.set(event, handler);
    },
  };
}

export const socketGateway = createSocketGateway();

export function broadcastStayInvalidated(stayId: number, realtime: RealtimeAdapter = socketGateway) {
  realtime.emitToRoom(`stay:${stayId}`, "stay:invalidated", {
    stayId,
    message: "Room access has expired or was checked out by reception.",
  });
  realtime.emitToRoom("admin", "stay:checked_out", { stayId });
}

export function broadcastStayCreated(stay: any, realtime: RealtimeAdapter = socketGateway) {
  realtime.emitToRoom("admin", "stay:created", stay);
}
