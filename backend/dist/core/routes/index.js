import { createAuthRouter } from "./auth.routes.js";
import { createStaysRouter } from "./stays.routes.js";
import { createRoomsRouter } from "./rooms.routes.js";
import { createSettingsRouter } from "./settings.routes.js";
import { createAuditRouter } from "./audit.routes.js";
import usersRouter from "./users.routes.js";
export function mountCoreRoutes(app, apiPrefix = "/api") {
    app.use(`${apiPrefix}/auth`, createAuthRouter());
    app.use(`${apiPrefix}/stays`, createStaysRouter());
    app.use(`${apiPrefix}/rooms`, createRoomsRouter());
    app.use(`${apiPrefix}/settings`, createSettingsRouter());
    app.use(`${apiPrefix}/audit-logs`, createAuditRouter());
    app.use(`${apiPrefix}/users`, usersRouter);
}
