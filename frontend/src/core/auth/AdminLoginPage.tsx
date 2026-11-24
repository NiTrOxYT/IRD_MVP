import React, { useState } from "react";
import { useLocation } from "wouter";
import { loginStaff } from "./authApi";
import type { StaffUser } from "./authTypes";
import { usePropertyLogo, usePropertyName } from "../property/useProperty";
import { Lock, User, ArrowRight } from "lucide-react";

export function AdminLogin() {
  const [, setLocation] = useLocation();
  const propertyName = usePropertyName();
  const propertyLogo = usePropertyLogo();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLandingRoute = (user: StaffUser) => {
    const perms = user.permissions || [];
    if (user.role === "admin" || perms.includes("*")) return "/admin/analytics";
    if (user.role === "kitchen" || perms.includes("kitchen:view")) return "/kitchen";
    if (user.role === "housekeeping" || perms.includes("housekeeping:view")) return "/housekeeping";
    if (user.role === "reception" || perms.includes("orders:view")) return "/reception";
    return "/admin";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginStaff(username.trim(), password);
      if (res.success && res.user) {
        setLocation(getLandingRoute(res.user));
      } else {
        setError("Authentication failed.");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-[#F6F4EF] px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-[rgba(20,18,16,0.1)] bg-white p-7 shadow-[0_12px_36px_-16px_rgba(20,18,16,0.14)] modal-3d-enter sm:p-8">
        <div className="mb-7 text-center">
          <img
            src={propertyLogo || "/kusum-kunja-cafe-logo.png"}
            alt={`${propertyName || "Property"} logo`}
            className="mx-auto mb-3.5 h-12 w-12 rounded-lg border border-[rgba(20,18,16,0.1)] bg-white p-1 object-contain"
          />
          {propertyName && (
            <p className="text-xs font-medium text-[#966F29]">{propertyName}</p>
          )}
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.01em] text-[#141210]">
            Operations Sign In
          </h1>
          <p className="mt-1 text-xs text-[#5C554E]">
            Reception, housekeeping, kitchen, and property administration
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="staff-username"
              className="mb-1.5 block text-xs font-medium text-[#141210]"
            >
              Username
            </label>
            <div className="relative">
              <input
                id="staff-username"
                type="text"
                placeholder="Enter staff username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10 w-full rounded-lg border border-[rgba(20,18,16,0.14)] bg-[#F6F4EF]/50 pl-9 pr-3 text-xs text-[#141210] placeholder:text-[#847C73] focus:border-[#141210] focus:bg-white focus:outline-none"
              />
              <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#847C73]" strokeWidth={1.5} />
            </div>
          </div>

          <div>
            <label
              htmlFor="staff-password"
              className="mb-1.5 block text-xs font-medium text-[#141210]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="staff-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-[rgba(20,18,16,0.14)] bg-[#F6F4EF]/50 pl-9 pr-3 text-xs text-[#141210] placeholder:text-[#847C73] focus:border-[#141210] focus:bg-white focus:outline-none"
              />
              <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#847C73]" strokeWidth={1.5} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#141210] px-4 text-xs font-medium text-white transition-[transform,background-color] hover:bg-[#2B2622] btn-smooth-press disabled:opacity-50"
          >
            <span>{loading ? "Authenticating..." : "Sign in to console"}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#D9C7A3]" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
