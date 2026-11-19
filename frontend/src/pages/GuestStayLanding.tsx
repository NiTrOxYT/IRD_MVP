import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { verifyStay } from "../lib/api";
import { QrCode } from "lucide-react";

/** Legacy route retained as a QR-only entry point. */
export function GuestStayLanding() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let token = new URLSearchParams(window.location.search).get("token");
    if (!token) token = localStorage.getItem("ird_stay_token");

    if (!token) {
      setLoading(false);
      return;
    }

    verifyStay(token)
      .then(() => {
        localStorage.setItem("ird_stay_token", token!);
        setLocation("/stay/menu");
      })
      .catch((err: Error) => {
        localStorage.removeItem("ird_stay_token");
        setError(err.message || "This room dining QR code is invalid or expired.");
        setLoading(false);
      });
  }, [setLocation]);

  return (
    <main className="min-h-screen bg-[#F8F5EF] flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm rounded-3xl border border-[#E5DDD1] bg-[#FFFDF9] p-7 text-center shadow-xl">
        <QrCode className="mx-auto mb-4 h-10 w-10 text-[#B88223]" />
        <h1 className="font-serif text-2xl font-bold text-[#1E150F]">In-Room Dining</h1>
        {loading ? (
          <p className="mt-3 text-sm text-[#73685C]">Verifying your room QR code…</p>
        ) : (
          <>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <p className="mt-3 text-sm leading-relaxed text-[#73685C]">
              Scan the dining QR code provided in your room. If it does not work, please contact Reception at extension 0.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
