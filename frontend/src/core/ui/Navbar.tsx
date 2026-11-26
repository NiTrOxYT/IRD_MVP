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
  Mail,
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
      if (isSuperAdmin || hasPermission(perms, "inbox:view")) {
        items.push({ href: "/admin/inbox", label: "Inbox", icon: <Mail size={16} /> });
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
    <header className="sticky top-0 z-40 border-b border-[#E5DDD1] bg-[#F8F5EF]/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 xl:shrink-0">
          <img
            src={propertyLogo || "/kusum-kunja-cafe-logo.png"}
            alt={`${propertyName || "Property"} logo`}
            className="h-9 w-9 shrink-0 rounded-xl border border-[#ECD7A9] bg-[#FFFDF9] p-0.5 object-contain shadow-2xs"
          />
          <div className="min-w-0">
            <h1 className="whitespace-nowrap font-serif text-base font-bold tracking-tight text-[#29231F] sm:text-lg">
              {propertyName || "In-Room Dining"}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#766B61] xl:whitespace-nowrap">
                {sectionLabel}
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border border-[#E5DDD1] bg-[#FFFDF9] px-2 py-0.5 text-[9px] font-semibold text-[#766B61] sm:inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full ${connStatus === "connected" ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} />
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
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-2 text-xs font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-150 btn-smooth-press ${
                    active
                      ? "border-[#D4A84D] bg-[#FAF3E6] text-[#8E6314] shadow-[0_2px_10px_-2px_rgba(184,130,35,0.2)]"
                      : "border-transparent text-[#766B61] hover:bg-[#EFE7DA] hover:text-[#29231F]"
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
              <span className="hidden text-xs text-[#766B61] 2xl:inline">
                <strong className="text-[#29231F]">{staffUser.fullName}</strong> · {staffUser.role}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-xl p-2 text-[#766B61] transition-[transform,background-color,color] duration-150 hover:bg-[#EFE7DA] hover:text-[#29231F] btn-smooth-press-sm"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] px-3 py-2 text-xs font-semibold text-[#29231F] shadow-2xs transition-[transform,background-color,border-color] duration-150 hover:bg-[#EFE7DA] btn-smooth-press"
            >
              <UserCheck size={14} /> Staff sign in
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
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,border-color,color] duration-150 btn-smooth-press-sm ${
                  active
                    ? "border-[#ECD7A9] bg-[#FAF3E6] text-[#8E6314] shadow-2xs"
                    : "border-transparent text-[#766B61] hover:bg-[#EFE7DA]/70"
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
