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
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,#FFFDF9_0%,#FAF8F5_55%,#F3ECE1_100%)] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-8 shadow-[0_24px_56px_-16px_rgba(30,21,15,0.16)] modal-3d-enter">
        <div className="text-center mb-8">
          <img
            src={propertyLogo || "/kusum-kunja-cafe-logo.png"}
            alt={`${propertyName || "Property"} logo`}
            className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-[#ECD7A9] bg-[#FFFDF9] p-1 object-contain shadow-xs"
          />
          {propertyName && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E6314] block mb-1">
              {propertyName}
            </span>
          )}
          <h1 className="font-serif text-2xl font-bold text-[#1E150F]">
            Staff Operations Portal
          </h1>
          <p className="font-script text-base text-[#73685C] mt-0.5">
            Reception, Butler Coordination & Kitchen KOT Console
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-medium shadow-2xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Staff Username
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
              <User className="w-4 h-4 text-[#73685C] absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E150F] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
              <Lock className="w-4 h-4 text-[#73685C] absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-white bg-[#1E150F] hover:bg-[#29231F] transition-[transform,background-color,box-shadow] shadow-md flex items-center justify-center gap-2 cursor-pointer btn-smooth-press disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Authenticating..." : "Sign In to Console"}</span>
            <ArrowRight className="w-4 h-4 text-[#B88223]" />
          </button>
        </form>
      </div>
    </div>
  );
}
