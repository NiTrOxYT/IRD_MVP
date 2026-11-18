import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { subscribeConnectionStatus } from "../lib/socket";
import { getStaffMe, logoutStaff, StaffUser } from "../lib/api";
import { Utensils, Bell, Users, ChefHat, Settings, LogOut, Radio, UserCheck } from "lucide-react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [connStatus, setConnStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    const unsub = subscribeConnectionStatus(setConnStatus);
    getStaffMe()
      .then((res) => setStaffUser(res.user))
      .catch(() => setStaffUser(null));
    return unsub;
  }, [location]);

  const handleLogout = async () => {
    await logoutStaff();
    setStaffUser(null);
    setLocation("/admin/login");
  };

  const isGuestView = location.startsWith("/stay") || location.startsWith("/order");
  const isKitchenView = location.startsWith("/kitchen");
  const isAdminView = location.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E5DDD1] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">🍽️</span>
              <div>
                <span className="font-serif text-lg font-bold tracking-tight text-[#1E150F] group-hover:text-[#B88223] transition-colors">
                  Aura Resort & Spa
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-[#73685C] font-semibold -mt-1">
                  In-Room Dining
                </span>
              </div>
            </Link>

            {/* Live Socket Status Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F8F5EF] border border-[#E5DDD1] text-[#73685C]">
              {connStatus === "connected" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-800 text-[11px] font-semibold">Live Realtime</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-amber-800 text-[11px] font-semibold">Reconnecting...</span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-4">
            {/* Quick Experience Selector */}
            <div className="flex items-center gap-1 bg-[#F8F5EF] p-1 rounded-xl border border-[#E5DDD1]/80 text-xs">
              <Link
                href="/stay"
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isGuestView
                    ? "bg-[#1E150F] text-white shadow-xs"
                    : "text-[#73685C] hover:text-[#1E150F]"
                }`}
              >
                Guest View
              </Link>
              <Link
                href="/admin/orders"
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isAdminView && !isKitchenView
                    ? "bg-[#1E150F] text-white shadow-xs"
                    : "text-[#73685C] hover:text-[#1E150F]"
                }`}
              >
                Reception
              </Link>
              <Link
                href="/kitchen"
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isKitchenView
                    ? "bg-[#B88223] text-white shadow-xs"
                    : "text-[#73685C] hover:text-[#1E150F]"
                }`}
              >
                Kitchen KOT
              </Link>
            </div>

            {/* Staff Info or Sign In */}
            {staffUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#73685C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B88223]"></span>
                  <span className="font-semibold text-[#1E150F]">{staffUser.fullName}</span> ({staffUser.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-[#73685C] hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Sign out of staff session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[#1E150F] hover:bg-[#EAE2D5]/50 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Staff Sign In
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
