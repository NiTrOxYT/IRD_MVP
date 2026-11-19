import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { subscribeConnectionStatus } from "../lib/socket";
import { getStaffMe, logoutStaff, StaffUser } from "../lib/api";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings,
  UserCheck,
  UtensilsCrossed,
  Users,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [connStatus, setConnStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);

  const isGuestRoute = location === "/" || location.startsWith("/stay") || location.startsWith("/order") || location === "/orders";
  const isReception = location.startsWith("/reception");
  const isKot = location.startsWith("/kot") || location.startsWith("/kitchen");
  const isAdmin = location.startsWith("/admin");

  useEffect(() => {
    if (isGuestRoute) return;
    const unsubscribe = subscribeConnectionStatus(setConnStatus);
    getStaffMe().then((result) => setStaffUser(result.user)).catch(() => setStaffUser(null));
    return unsubscribe;
  }, [location, isGuestRoute]);

  const navItems = useMemo<NavItem[]>(() => {
    if (isReception) return [
      { href: "/reception", label: "Live Orders", icon: <ClipboardList size={16} /> },
      { href: "/reception/stays", label: "Stays & Rooms", icon: <Users size={16} /> },
    ];
    if (isKot) return [];
    if (isAdmin) return [
      { href: "/admin", label: "Overview", icon: <LayoutDashboard size={16} /> },
      { href: "/admin/menu", label: "Menu", icon: <UtensilsCrossed size={16} /> },
      { href: "/admin/orders", label: "Orders", icon: <ClipboardList size={16} /> },
      { href: "/admin/stays", label: "Stays", icon: <Users size={16} /> },
      { href: "/admin/qr", label: "QR Codes", icon: <QrCode size={16} /> },
      { href: "/admin/settings", label: "Settings", icon: <Settings size={16} /> },
    ];
    return [];
  }, [isAdmin, isKot, isReception]);

  if (isGuestRoute) return null;

  const handleLogout = async () => {
    await logoutStaff();
    setStaffUser(null);
    setLocation("/admin/login");
  };

  const sectionLabel = isReception ? "Reception Console" : isKot ? "Kitchen KOT Display" : "Admin Management";

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5DDD1] bg-[#F8F5EF]/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/kusum-kunja-cafe-logo.png" alt="Kusum Kunja Café" className="h-9 w-9 shrink-0 rounded-full border border-[#ECD7A9] object-cover shadow-2xs" />
          <div className="min-w-0">
            <h1 className="whitespace-nowrap font-serif text-base font-bold tracking-tight text-[#29231F] sm:text-lg">Kusum Kunja Café</h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#766B61]">{sectionLabel}</span>
              <span className="hidden items-center gap-1.5 rounded-full border border-[#E5DDD1] bg-[#FFFDF9] px-2 py-0.5 text-[9px] font-semibold text-[#766B61] sm:inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full ${connStatus === "connected" ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} />
                {connStatus === "connected" ? "Live" : "Syncing"}
              </span>
            </div>
          </div>
        </div>

        {navItems.length > 0 && (
          <nav aria-label="Staff navigation" className="hidden items-center gap-0.5 xl:flex">
            {navItems.map((item) => {
              const active = location === item.href || (item.href === "/admin" && location === "/admin");
              return (
                <Link key={item.href} href={item.href} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${active ? "border-[#ECD7A9] bg-[#FAF3E6] text-[#8E6314] shadow-2xs" : "border-transparent text-[#766B61] hover:bg-[#EFE7DA] hover:text-[#29231F]"}`}>
                  {item.icon}{item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {staffUser ? (
            <>
              <span className="hidden text-xs text-[#766B61] 2xl:inline"><strong className="text-[#29231F]">{staffUser.fullName}</strong> · {staffUser.role}</span>
              <button onClick={handleLogout} className="rounded-lg p-2 text-[#766B61] transition-colors hover:bg-[#EFE7DA] hover:text-[#29231F]" title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
            </>
          ) : (
            <Link href="/admin/login" className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5DDD1] bg-[#FFFDF9] px-3 py-2 text-xs font-semibold text-[#29231F] shadow-2xs transition-colors hover:bg-[#EFE7DA]"><UserCheck size={14} /> Staff sign in</Link>
          )}
        </div>
      </div>

      {navItems.length > 0 && (
        <nav aria-label="Staff navigation" className="flex gap-1 overflow-x-auto px-4 pb-2 no-scrollbar xl:hidden">
          {navItems.map((item) => {
            const active = location === item.href;
            return <Link key={item.href} href={item.href} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? "bg-[#FAF3E6] text-[#8E6314]" : "text-[#766B61]"}`}>{item.icon}{item.label}</Link>;
          })}
        </nav>
      )}
    </header>
  );
}
