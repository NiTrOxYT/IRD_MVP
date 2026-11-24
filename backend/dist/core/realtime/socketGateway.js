import { Server as SocketIOServer } from "socket.io";
import cookie from "cookie";
function extractSocketToken(socket) {
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
export function createSocketGateway() {
    let io = null;
    const roomHandlers = new Map();
    // Core stay room handler
    roomHandlers.set("join:stay", (socket, payload) => {
        const stayId = payload?.stayId;
        if (stayId) {
            socket.join(`stay:${stayId}`);
            socket.emit("joined:stay", { stayId });
        }
    });
    return {
        init(server, corsOrigin) {
            io = new SocketIOServer(server, {
                cors: {
                    origin: corsOrigin ?? "*",
                    methods: ["GET", "POST"],
                    credentials: true,
                },
                path: process.env.SOCKET_PATH || "/socket.io/",
            });
            io.on("connection", (socket) => {
                for (const [event, handler] of roomHandlers.entries()) {
                    socket.on(event, (payload) => handler(socket, payload, { extractToken: extractSocketToken }));
                }
                socket.on("disconnect", () => {
                    // socket disconnected cleanly
                });
            });
            return io;
        },
        getIO() {
            return io;
        },
        emitToRoom(room, event, payload) {
            if (!io)
                return;
            io.to(room).emit(event, payload);
        },
        registerRoomHandler(event, handler) {
            roomHandlers.set(event, handler);
        },
    };
}
export const socketGateway = createSocketGateway();
export function broadcastStayInvalidated(stayId, realtime = socketGateway) {
    realtime.emitToRoom(`stay:${stayId}`, "stay:invalidated", {
        stayId,
        message: "Room access has expired or was checked out by reception.",
    });
    realtime.emitToRoom("admin", "stay:checked_out", { stayId });
}
export function broadcastStayCreated(stay, realtime = socketGateway) {
    realtime.emitToRoom("admin", "stay:created", stay);
}
