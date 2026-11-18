import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { verifyStay, lookupStayByPin } from "../lib/api";
import { KeyRound, QrCode, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function GuestStayLanding() {
  const [, setLocation] = useLocation();
  const [roomNumber, setRoomNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if ?token=... is present in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setLoading(true);
      verifyStay(token)
        .then(() => {
          localStorage.setItem("ird_stay_token", token);
          setLocation("/stay/menu");
        })
        .catch((err) => {
          setError(err.message || "Invalid or expired stay QR code.");
          setLoading(false);
        });
      return;
    }

    // Check if token already exists in localStorage
    const savedToken = localStorage.getItem("ird_stay_token");
    if (savedToken) {
      verifyStay(savedToken)
        .then(() => {
          setLocation("/stay/menu");
        })
        .catch(() => {
          localStorage.removeItem("ird_stay_token");
        });
    }
  }, [setLocation]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !pin.trim()) {
      setError("Please enter your Room Number and 4-digit PIN.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await lookupStayByPin(roomNumber, pin);
      localStorage.setItem("ird_stay_token", res.stayToken);
      setLocation("/stay/menu");
    } catch (err: any) {
      setError(err.message || "No active stay matching this room number and PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    localStorage.setItem("ird_stay_token", "demo-stay-room-301");
    setLocation("/stay/menu");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-8 shadow-xl text-center">
        {/* Crest */}
        <div className="w-16 h-16 rounded-2xl bg-[#1E150F] text-[#B88223] flex items-center justify-center text-3xl mx-auto mb-6 shadow-md">
          👑
        </div>

        <h1 className="font-serif text-3xl font-bold text-[#1E150F] mb-2">
          In-Room Dining
        </h1>
        <p className="text-sm text-[#73685C] mb-8 leading-relaxed">
          Welcome to Aura Resort & Spa. Please authenticate your suite access to explore our handcrafted culinary offerings.
        </p>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-left">
            {error}
          </div>
        )}

        {/* PIN Lookup Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#73685C] mb-1.5">
              Room / Suite Number
            </label>
            <input
              type="text"
              placeholder="e.g. 301, Villa 1"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-sm font-medium text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30 focus:border-[#B88223]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#73685C] mb-1.5">
              Guest Security PIN
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                placeholder="4-digit PIN on keycard"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8F5EF] border border-[#E5DDD1] rounded-xl text-sm font-mono tracking-widest text-[#1E150F] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30 focus:border-[#B88223]"
              />
              <KeyRound className="w-4 h-4 text-[#73685C] absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-[#1E150F] hover:bg-[#29231F] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Verifying Access..." : "Enter Suite Dining"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* QR Scan Help */}
        <div className="mt-8 pt-6 border-t border-[#E5DDD1]/70 flex items-center justify-center gap-2 text-xs text-[#73685C]">
          <QrCode className="w-4 h-4 text-[#B88223]" />
          <span>Or scan the dining QR code on your suite console.</span>
        </div>

        {/* Demo Shortcut */}
        <div className="mt-4">
          <button
            onClick={handleDemoAccess}
            className="w-full py-2 px-3 text-xs font-semibold text-[#825C15] bg-[#B88223]/10 hover:bg-[#B88223]/20 border border-[#B88223]/30 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Instant Demo: Room 301 (Alexander Wright)
          </button>
        </div>
      </div>
    </div>
  );
}
