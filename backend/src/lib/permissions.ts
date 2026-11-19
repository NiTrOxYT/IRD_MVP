export type PermissionAction = "view" | "create" | "edit" | "delete" | "manage";

export interface PermissionItem {
  id: string; // e.g. "orders:view"
  module: string;
  action: PermissionAction;
  label: string;
  description: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  actions: PermissionAction[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "overview",
    name: "Overview",
    description: "Operational summary dashboard and live resort status",
    actions: ["view"],
  },
  {
    id: "orders",
    name: "Orders",
    description: "Guest room dining orders, status transitions, and billing",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "stays",
    name: "Stays & Rooms",
    description: "Guest stay verification, room registration, and concierge check-in/out",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
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
    id: "housekeeping",
    name: "Housekeeping",
    description: "Guest room cleaning, fresh linens, toiletries, and amenities requests",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
  {
    id: "users",
    name: "User Management",
    description: "Staff accounts, role creation, password resets, and access permissions",
    actions: ["view", "create", "edit", "delete", "manage"],
  },
];

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

  // Superuser wildcard
  if (userPermissions.includes("*")) {
    return true;
  }

  // Exact match
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
