import { Server as SocketIOServer } from "socket.io";
import cookie from "cookie";
import { verifyStaffToken } from "./lib/auth.js";
let io = null;
export function initSocket(server) {
    io = new SocketIOServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        path: "/socket.io/",
    });
    io.on("connection", (socket) => {
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
        // 3. Join Stay Room (For guest devices in the room)
        socket.on("join:stay", ({ stayId }) => {
            if (stayId) {
                socket.join(`stay:${stayId}`);
                socket.emit("joined:stay", { stayId });
            }
        });
        // 4. Join Specific Order Room
        socket.on("join:order", ({ orderId }) => {
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
export function getIO() {
    return io;
}
export function broadcastOrderCreated(order) {
    if (!io)
        return;
    // Notify admin
    io.to("admin").emit("order:created", order);
    // Notify stay
    io.to(`stay:${order.stay_id || order.stayId}`).emit("order:created", order);
}
export function broadcastOrderStatusChanged(order, previousStatus) {
    if (!io)
        return;
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
export function broadcastStayInvalidated(stayId) {
    if (!io)
        return;
    io.to(`stay:${stayId}`).emit("stay:invalidated", {
        stayId,
        message: "Room access has expired or was checked out by reception.",
    });
    io.to("admin").emit("stay:checked_out", { stayId });
}
export function broadcastStayCreated(stay) {
    if (!io)
        return;
    io.to("admin").emit("stay:created", stay);
}
