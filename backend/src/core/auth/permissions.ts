import type { PermissionAction, PermissionModule } from "../module.js";

export type { PermissionAction, PermissionModule };

export interface PermissionItem {
  id: string;
  module: string;
  action: PermissionAction;
  label: string;
  description: string;
}

export const CORE_PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "overview",
    name: "Overview",
    description: "Operational summary dashboard and live resort status",
    actions: ["view"],
  },
  {
    id: "stays",
    name: "Stays & Rooms",
    description: "Guest stay verification, room registration, and concierge check-in/out",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "qr",
    name: "Room QR Codes",
    description: "In-room contactless QR tokens, inspection, and printable sheets",
    actions: ["view", "manage"],
  },
  {
    id: "settings",
    name: "Settings",
    description: "Resort operating hours, tax rates, service charges, and system preferences",
    actions: ["view", "manage"],
  },
  {
    id: "users",
    name: "User Management",
    description: "Staff accounts, role creation, password resets, and access permissions",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
];

// Default full catalog (core + built-in IRD & Room Service modules)
const DEFAULT_MODULE_PERMISSIONS: PermissionModule[] = [
  ...CORE_PERMISSION_MODULES.slice(0, 1),
  {
    id: "orders",
    name: "Orders",
    description: "Guest room dining orders, status transitions, and billing",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  CORE_PERMISSION_MODULES[1],
  {
    id: "menu",
    name: "Menu & Categories",
    description: "Dishes, culinary categories, sizes/variants, modifiers, and pricing",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "inventory",
    name: "Inventory & Raw Materials",
    description: "Portion tracking, raw ingredients, recipes (BOM), and stock adjustments",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Sales trends, popular items, order velocity, and revenue reports",
    actions: ["view"],
  },
  CORE_PERMISSION_MODULES[2],
  CORE_PERMISSION_MODULES[3],
  {
    id: "housekeeping",
    name: "Housekeeping",
    description: "Guest room cleaning, fresh linens, toiletries, and amenities requests",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "attractions",
    name: "Local Attractions",
    description: "Nearby sightseeing spots, photos/videos, pricing packages, and 5-star ratings",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "faq",
    name: "Guest FAQ",
    description: "Manageable list of frequently asked guest questions and answers",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "inbox",
    name: "Guest Inbox & Notifications",
    description: "Push targeted room notifications and resort-wide guest inbox announcements",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  CORE_PERMISSION_MODULES[4],
];

const registeredPermissions = new Map<string, PermissionModule>(
  DEFAULT_MODULE_PERMISSIONS.map((m) => [m.id, m])
);

export const PERMISSION_MODULES: PermissionModule[] = DEFAULT_MODULE_PERMISSIONS;

export function registerPermissionModules(modules: PermissionModule[]): void {
  for (const mod of modules) {
    registeredPermissions.set(mod.id, mod);
  }
}

export function getRegisteredPermissionModules(): PermissionModule[] {
  return Array.from(registeredPermissions.values());
}

/**
 * Checks if a user's granted permissions satisfy the required permission.
 * - Wildcard "*" grants everything.
 * - "module:manage" or "module:*" grants any action on that module.
 * - Direct match "module:action" grants the action.
 * - Denies access by default if permission is absent.
 */
export function hasPermission(
  userPermissions: string[] | undefined | null,
  requiredPermission: string
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }

  if (userPermissions.includes("*")) {
    return true;
  }

  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  const [mod] = requiredPermission.split(":");
  if (mod) {
    if (userPermissions.includes(`${mod}:*`) || userPermissions.includes(`${mod}:manage`)) {
      return true;
    }
  }

  return false;
}
