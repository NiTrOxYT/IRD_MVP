import { Router } from "express";
import type { InboxModuleDeps } from "./types.js";
import { createInboxRouter } from "./routes/inbox.routes.js";

export type { InboxModuleDeps, GuestInboxMessageDTO } from "./types.js";
export * from "./validation.js";
export { createInboxRouter } from "./routes/inbox.routes.js";

export const INBOX_PERMISSIONS = [
  {
    id: "inbox",
    name: "Guest Inbox & Notifications",
    description: "Push targeted room notifications and resort-wide guest inbox announcements",
    actions: ["view", "create", "edit", "delete", "manage"] as const,
  },
];

export function createInboxModule(deps: InboxModuleDeps) {
  const router = Router();
  const inboxRouter = createInboxRouter(deps);

  router.use("/inbox", inboxRouter);

  return {
    id: "inbox",
    name: "Guest Inbox",
    permissions: INBOX_PERMISSIONS,
    router,
    routes: {
      inbox: inboxRouter,
    },
    registerRealtime: () => {},
  };
}
