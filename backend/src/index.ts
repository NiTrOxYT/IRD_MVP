import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Core Platform
import { runMigrations } from "./core/db/migrate.js";
import { createCoreModuleDeps } from "./core/deps.js";
import { registerPermissionModules } from "./core/auth/permissions.js";
import { socketGateway } from "./core/realtime/socketGateway.js";
import { mountCoreRoutes } from "./core/routes/index.js";

// Pluggable Domain Modules
import { createIrdModule } from "./modules/ird/module.js";
import { createRoomServiceModule } from "./modules/room-service/module.js";
import { createAttractionsModule } from "./modules/attractions/module.js";
import { createFaqModule } from "./modules/faq/module.js";
import { createInboxModule } from "./modules/inbox/module.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Env-driven CORS so frontend can be hosted on a separate origin or gateway
const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOrigin: boolean | string[] = configuredOrigins.length > 0 ? configuredOrigins : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Healthcheck
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "Aura Resort Modular Platform API",
    modules: ["core", "ird", "room-service", "attractions", "faq", "inbox"],
    timestamp: new Date().toISOString(),
  });
});

// Assemble dependency-injected module deps
const moduleDeps = createCoreModuleDeps();

// Instantiate isolated domain modules
const irdModule = createIrdModule(moduleDeps);
const roomServiceModule = createRoomServiceModule(moduleDeps);
const attractionsModule = createAttractionsModule(moduleDeps);
const faqModule = createFaqModule(moduleDeps);
const inboxModule = createInboxModule(moduleDeps);

// Register permissions & realtime socket handlers for each module
registerPermissionModules([
  ...irdModule.permissions,
  ...roomServiceModule.permissions,
  ...attractionsModule.permissions,
  ...faqModule.permissions,
  ...inboxModule.permissions,
]);
irdModule.registerRealtime();
roomServiceModule.registerRealtime();
attractionsModule.registerRealtime();
faqModule.registerRealtime();
inboxModule.registerRealtime();

// Initialize WebSocket gateway after modules register their room handlers
socketGateway.init(server, configuredOrigins.length > 0 ? configuredOrigins : "*");

// Mount Core + Domain Module Routes
mountCoreRoutes(app, "/api");
app.use("/api", irdModule.router);
app.use("/api", roomServiceModule.router);
app.use("/api", attractionsModule.router);
app.use("/api", faqModule.router);
app.use("/api", inboxModule.router);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await runMigrations();
  } catch (err: any) {
    console.warn("[Startup] Could not run DB migrations immediately (DB may still be starting):", err.message);
  }

  server.listen(PORT, () => {
    console.log(`[Aura Platform] Backend API listening on port ${PORT} (modules: core, ird, room-service, attractions, faq)`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export { app, server, irdModule, roomServiceModule, attractionsModule, faqModule, inboxModule };
