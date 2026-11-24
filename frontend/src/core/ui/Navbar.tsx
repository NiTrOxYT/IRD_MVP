import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { subscribeConnectionStatus } from "../transport/realtimeClient";
import { getStaffMe, logoutStaff } from "../auth/authApi";
import type { StaffUser } from "../auth/authTypes";
import { hasPermission } from "../auth/permissions";
import { usePropertyLogo, usePropertyName } from "../property/useProperty";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Compass,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings,
  Sparkles,
  UserCheck,
  UtensilsCrossed,
  Users,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [connStatus, setConnStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);

  const isGuestRoute =
    location === "/" ||
    location.startsWith("/stay") ||
    location.startsWith("/order") ||
    location === "/orders";
  const isReception = location.startsWith("/reception");
  const isKot = location.startsWith("/kot") || location.startsWith("/kitchen");
  const isHousekeeping = location.startsWith("/housekeeping");
  const isAdmin = location.startsWith("/admin");
  const propertyName = usePropertyName(!isGuestRoute);
  const propertyLogo = usePropertyLogo(!isGuestRoute);

  useEffect(() => {
    if (isGuestRoute) return;
    const unsubscribe = subscribeConnectionStatus(setConnStatus);
    getStaffMe()
      .then((result) => setStaffUser(result.user))
      .catch(() => setStaffUser(null));
    return unsubscribe;
  }, [location, isGuestRoute]);

  const navItems = useMemo<NavItem[]>(() => {
    const perms = staffUser?.permissions || [];
    const isSuperAdmin = staffUser?.role === "admin" || perms.includes("*");

    if (isHousekeeping) {
      const items: NavItem[] = [
        { href: "/housekeeping", label: "Housekeeping", icon: <Sparkles size={16} /> },
      ];
      if (isSuperAdmin || hasPermission(perms, "stays:view")) {
        items.push({ href: "/reception/stays", label: "Stays & Rooms", icon: <Users size={16} /> });
      }
      if (isSuperAdmin) {
        items.push({ href: "/admin", label: "Admin", icon: <LayoutDashboard size={16} /> });
      }
      return items;
    }

    if (isReception) {
      return [
        { href: "/reception", label: "Live Orders", icon: <ClipboardList size={16} /> },
        { href: "/reception/stays", label: "Stays & Rooms", icon: <Users size={16} /> },
        ...(isSuperAdmin || hasPermission(perms, "housekeeping:view")
          ? [{ href: "/housekeeping", label: "Housekeeping", icon: <Sparkles size={16} /> }]
          : []),
      ];
    }
    if (isKot) return [];
    if (isAdmin) {
      const items: NavItem[] = [];

      if (isSuperAdmin || hasPermission(perms, "overview:view")) {
        items.push({ href: "/admin", label: "Overview", icon: <LayoutDashboard size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "housekeeping:view")) {
        items.push({ href: "/housekeeping", label: "Housekeeping", icon: <Sparkles size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "attractions:view")) {
        items.push({ href: "/admin/attractions", label: "Attractions", icon: <Compass size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "faq:view")) {
        items.push({ href: "/admin/faq", label: "FAQ", icon: <HelpCircle size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "menu:view")) {
        items.push({ href: "/admin/menu", label: "Menu", icon: <UtensilsCrossed size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "inventory:view")) {
        items.push({ href: "/admin/inventory", label: "Inventory", icon: <Boxes size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "orders:view")) {
        items.push({ href: "/admin/orders", label: "Orders", icon: <ClipboardList size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "analytics:view")) {
        items.push({ href: "/admin/analytics", label: "Analytics", icon: <BarChart3 size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "stays:view")) {
        items.push({ href: "/admin/stays", label: "Stays", icon: <Users size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "qr:view")) {
        items.push({ href: "/admin/qr", label: "QR Codes", icon: <QrCode size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "users:view")) {
        items.push({ href: "/admin/users", label: "Users & Roles", icon: <UserCheck size={16} /> });
      }
      if (isSuperAdmin || hasPermission(perms, "settings:view")) {
        items.push({ href: "/admin/settings", label: "Settings", icon: <Settings size={16} /> });
      }

      return items;
    }
    return [];
  }, [isAdmin, isHousekeeping, isKot, isReception, staffUser]);

  if (isGuestRoute) return null;

  const handleLogout = async () => {
    await logoutStaff();
    setStaffUser(null);
    setLocation("/admin/login");
  };

  const sectionLabel = isReception
    ? "Reception Console"
    : isKot
    ? "Kitchen KOT Display"
    : isHousekeeping
    ? "Housekeeping Console"
    : "Admin Management";

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(20,18,16,0.09)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 xl:shrink-0">
          <img
            src={propertyLogo || "/kusum-kunja-cafe-logo.png"}
            alt={`${propertyName || "Property"} logo`}
            className="h-8 w-8 shrink-0 rounded-md border border-[rgba(20,18,16,0.1)] bg-white p-0.5 object-contain"
          />
          <div className="min-w-0">
            <h1 className="whitespace-nowrap font-serif text-[17px] font-semibold leading-none tracking-[-0.01em] text-[#141210] sm:text-[19px]">
              {propertyName || "Property Operations"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#5C554E]">
              <span className="xl:whitespace-nowrap">{sectionLabel}</span>
              <span className="hidden items-center gap-1 rounded-md border border-[rgba(20,18,16,0.09)] bg-[#F6F4EF] px-1.5 py-px text-[10px] font-medium text-[#5C554E] sm:inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full ${connStatus === "connected" ? "bg-emerald-600" : "bg-amber-500"}`} />
                {connStatus === "connected" ? "Live" : "Syncing"}
              </span>
            </div>
          </div>
        </div>

        {navItems.length > 0 && (
          <nav aria-label="Staff navigation" className="hidden min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto no-scrollbar xl:flex">
            {navItems.map((item) => {
              const active = location === item.href || (item.href === "/admin" && location === "/admin");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 btn-smooth-press-sm ${
                    active
                      ? "border-[rgba(20,18,16,0.16)] bg-[#F6F4EF] text-[#141210]"
                      : "border-transparent text-[#5C554E] hover:bg-[#F6F4EF]/70 hover:text-[#141210]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {staffUser ? (
            <>
              <span className="hidden text-xs text-[#5C554E] 2xl:inline">
                <strong className="font-medium text-[#141210]">{staffUser.fullName}</strong> · {staffUser.role}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-[#5C554E] transition-[transform,background-color,color] duration-150 hover:bg-[#F6F4EF] hover:text-[#141210] btn-smooth-press-sm"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} strokeWidth={1.6} />
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(20,18,16,0.12)] bg-white px-3 text-xs font-medium text-[#141210] transition-[transform,background-color,border-color] duration-150 hover:border-[rgba(20,18,16,0.26)] btn-smooth-press-sm"
            >
              <UserCheck size={14} strokeWidth={1.6} /> Staff sign in
            </Link>
          )}
        </div>
      </div>

      {navItems.length > 0 && (
        <nav aria-label="Staff navigation" className="flex gap-1 overflow-x-auto px-4 pb-2 no-scrollbar xl:hidden">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 btn-smooth-press-sm ${
                  active
                    ? "border-[rgba(20,18,16,0.14)] bg-[#F6F4EF] text-[#141210]"
                    : "border-transparent text-[#5C554E] hover:text-[#141210]"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
