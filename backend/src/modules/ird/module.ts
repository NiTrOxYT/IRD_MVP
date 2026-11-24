import { Router } from "express";
import type { IrdModuleDeps } from "./types.js";
import { registerIrdRealtime } from "./realtime.js";
import { createMenuRouter } from "./routes/menu.routes.js";
import { createOrdersRouter } from "./routes/orders.routes.js";
import { createKitchenRouter } from "./routes/kitchen.routes.js";
import { createInventoryRouter } from "./routes/inventory.routes.js";
import { createAnalyticsRouter } from "./routes/analytics.routes.js";

export type { IrdModuleDeps } from "./types.js";
export * from "./units.js";
export * from "./validation.js";
export * from "./tokens.js";
export { deductOrderStock, reverseOrderStock } from "./services/inventory.service.js";
export { registerIrdRealtime, createIrdBroadcasters } from "./realtime.js";
export { createMenuRouter } from "./routes/menu.routes.js";
export { createOrdersRouter } from "./routes/orders.routes.js";
export { createKitchenRouter } from "./routes/kitchen.routes.js";
export { createInventoryRouter } from "./routes/inventory.routes.js";
export { createAnalyticsRouter } from "./routes/analytics.routes.js";

export const IRD_PERMISSIONS = [
  {
    id: "orders",
    name: "Orders",
    description: "Guest room dining orders, status transitions, and billing",
    actions: ["view", "create", "edit", "delete", "manage"] as const,
  },
  {
    id: "menu",
    name: "Menu & Categories",
    description: "Dishes, culinary categories, sizes/variants, modifiers, and pricing",
    actions: ["view", "create", "edit", "delete", "manage"] as const,
  },
  {
    id: "inventory",
    name: "Inventory & Raw Materials",
    description: "Portion tracking, raw ingredients, recipes (BOM), and stock adjustments",
    actions: ["view", "create", "edit", "delete", "manage"] as const,
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Sales trends, popular items, order velocity, and revenue reports",
    actions: ["view"] as const,
  },
];

export function createIrdModule(deps: IrdModuleDeps) {
  const router = Router();
  const menuRouter = createMenuRouter(deps);
  const ordersRouter = createOrdersRouter(deps);
  const kitchenRouter = createKitchenRouter(deps);
  const inventoryRouter = createInventoryRouter(deps);
  const analyticsRouter = createAnalyticsRouter(deps);

  router.use("/menu", menuRouter);
  router.use("/orders", ordersRouter);
  router.use("/kitchen", kitchenRouter);
  router.use("/inventory", inventoryRouter);
  router.use("/analytics", analyticsRouter);

  return {
    id: "ird",
    name: "In-Room Dining",
    permissions: IRD_PERMISSIONS,
    router,
    routes: {
      menu: menuRouter,
      orders: ordersRouter,
      kitchen: kitchenRouter,
      inventory: inventoryRouter,
      analytics: analyticsRouter,
    },
    registerRealtime: () => registerIrdRealtime(deps),
  };
}
