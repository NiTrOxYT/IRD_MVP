import React, { useState } from "react";
import { useLocation } from "wouter";
import { loginStaff } from "../lib/api";
import { Lock, User, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

export function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginStaff(username, password);
      if (res.user.role === "kitchen") {
        setLocation("/kitchen");
      } else {
        setLocation("/admin/orders");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setLoading(true);
    setError(null);
    try {
      const res = await loginStaff(u, p);
      if (res.user.role === "kitchen") {
        setLocation("/kitchen");
      } else {
        setLocation("/admin/orders");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1E150F] text-[#B88223] flex items-center justify-center text-2xl mx-auto mb-4 shadow-md">
            🛡️
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E150F]">
            Staff Portal Sign In
          </h1>
          <p className="text-xs text-[#73685C] mt-1">
            Reception, Management & Culinary Operations Console
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#73685C] mb-1.5">
              Staff Username
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-sm text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
              <User className="w-4 h-4 text-[#73685C] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#73685C] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-sm text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30"
              />
              <Lock className="w-4 h-4 text-[#73685C] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-[#1E150F] hover:bg-[#29231F] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to Console"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div className="mt-8 pt-6 border-t border-[#E5DDD1] space-y-2">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#73685C] text-center mb-2">
            One-Click Demo Roles
          </span>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleQuickLogin("reception", "staff123")}
              className="w-full py-2 px-3 text-xs font-semibold text-[#1E150F] bg-[#F8F5EF] hover:bg-[#EAE2D5] border border-[#E5DDD1] rounded-xl transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>🛎️ Front Desk / Reception</span>
              <span className="font-mono text-[10px] text-[#73685C]">reception / staff123</span>
            </button>
            <button
              onClick={() => handleQuickLogin("chef", "kitchen123")}
              className="w-full py-2 px-3 text-xs font-semibold text-[#825C15] bg-[#B88223]/10 hover:bg-[#B88223]/20 border border-[#B88223]/30 rounded-xl transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>👨‍🍳 Kitchen Console (KDS)</span>
              <span className="font-mono text-[10px] text-[#825C15]">chef / kitchen123</span>
            </button>
            <button
              onClick={() => handleQuickLogin("admin", "admin123")}
              className="w-full py-2 px-3 text-xs font-semibold text-[#1E150F] bg-[#F8F5EF] hover:bg-[#EAE2D5] border border-[#E5DDD1] rounded-xl transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>👑 General Manager (Admin)</span>
              <span className="font-mono text-[10px] text-[#73685C]">admin / admin123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
