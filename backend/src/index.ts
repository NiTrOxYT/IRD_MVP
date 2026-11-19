import express, { Request, Response, NextFunction } from "express";
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
import inventoryRoutes from "./routes/inventory.js";
import analyticsRoutes from "./routes/analytics.js";
import usersRoutes from "./routes/users.js";
import housekeepingRoutes from "./routes/housekeeping.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local development and mobile network access
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Healthcheck
app.get("/api/health", (_req: Request, res: Response) => {
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
app.use("/api/inventory", inventoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/housekeeping", housekeepingRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
  } catch (err: any) {
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
