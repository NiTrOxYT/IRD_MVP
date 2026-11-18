import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { initSocket } from "./socket.js";
import { runMigrations } from "./db/migrate.js";
// Routes
import authRoutes from "./routes/auth.js";
import staysRoutes from "./routes/stays.js";
import roomsRoutes from "./routes/rooms.js";
import menuRoutes from "./routes/menu.js";
import ordersRoutes from "./routes/orders.js";
import kitchenRoutes from "./routes/kitchen.js";
import settingsRoutes from "./routes/settings.js";
import auditRoutes from "./routes/audit.js";
dotenv.config();
const app = express();
const server = http.createServer(app);
// Initialize WebSockets
initSocket(server);
// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow local development and mobile network access
        callback(null, true);
    },
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
// Healthcheck
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "Aura Resort In-Room Dining API",
        timestamp: new Date().toISOString(),
    });
});
// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/stays", staysRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/kitchen", kitchenRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/audit-logs", auditRoutes);
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error("[Server Error]", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal server error",
    });
});
const PORT = process.env.PORT || 5001;
async function startServer() {
    // Run DB migrations automatically if PostgreSQL is reachable
    try {
        await runMigrations();
    }
    catch (err) {
        console.warn("[Startup] Could not run DB migrations immediately (DB may still be starting):", err.message);
    }
    server.listen(PORT, () => {
        console.log(`[Aura IRD] In-Room Dining backend listening on port ${PORT}`);
    });
}
// Only start listening when not running unit tests
if (process.env.NODE_ENV !== "test") {
    startServer();
}
export { app, server };
