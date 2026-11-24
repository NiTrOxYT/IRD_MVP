import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { PropertySettings, VerifiedStaySession } from "../property/propertyTypes";
import { corePropertyApi } from "../property/propertyApi";
import { setPropertyFavicon } from "../property/useProperty";
import {
  joinStayRoom,
  onStayInvalidated,
  subscribeConnectionStatus,
  type ConnectionStatus,
} from "../transport/realtimeClient";

export interface StaySessionContextValue {
  stay: VerifiedStaySession | null;
  property: PropertySettings | null;
  authLoading: boolean;
  authError: string | null;
  connStatus: ConnectionStatus;
  setProperty: React.Dispatch<React.SetStateAction<PropertySettings | null>>;
  clearStay: (reason?: string) => void;
}

const StaySessionContext = createContext<StaySessionContextValue | null>(null);

export function StaySessionProvider({
  children,
  onStayCheckedOut,
}: {
  children: React.ReactNode;
  onStayCheckedOut?: (message: string) => void;
}) {
  const initialLoadStartedAt = useRef(performance.now());
  const [stay, setStay] = useState<VerifiedStaySession | null>(null);
  const [property, setProperty] = useState<PropertySettings | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("connected");

  const clearStay = useCallback((reason?: string) => {
    localStorage.removeItem("ird_stay_token");
    setStay(null);
    if (reason) setAuthError(reason);
  }, []);

  const verifyToken = useCallback(async (token: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await corePropertyApi.verifyStay(token);
      localStorage.setItem("ird_stay_token", token);
      setStay(res.stay);
      setProperty(res.property);
      joinStayRoom(res.stay.id);
      return res;
    } catch (err: any) {
      localStorage.removeItem("ird_stay_token");
      setAuthError(err.message || "Invalid or expired in-room access.");
      throw err;
    } finally {
      const minVisibleMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 450 : 2300;
      const remainingMs = Math.max(0, minVisibleMs - (performance.now() - initialLoadStartedAt.current));
      if (remainingMs > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remainingMs));
      }
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    setPropertyFavicon(property?.logoUrl || null);
  }, [property?.logoUrl]);

  useEffect(() => {
    const onLogoUpdated = (event: Event) => {
      const logoUrl = (event as CustomEvent<string | null>).detail;
      setProperty((current) => (current ? { ...current, logoUrl } : current));
    };
    window.addEventListener("property-logo-updated", onLogoUpdated);
    return () => window.removeEventListener("property-logo-updated", onLogoUpdated);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token") || params.get("stay") || params.get("t");
    const roomQrParam = params.get("roomQr");

    if (tokenParam || roomQrParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const stayToken = tokenParam
        ? Promise.resolve(tokenParam)
        : corePropertyApi.resolveRoomQr(roomQrParam!).then((result) => result.stayToken);

      stayToken.then(verifyToken).catch((err: any) => {
        setAuthError(err?.message || "This room QR code could not be verified. Please contact Reception.");
        setAuthLoading(false);
      });
      return;
    }

    const savedToken = localStorage.getItem("ird_stay_token");
    if (savedToken) {
      verifyToken(savedToken).catch(() => {});
      return;
    }

    setAuthLoading(false);
  }, [verifyToken]);

  useEffect(() => {
    if (!stay?.id) return;

    joinStayRoom(stay.id);

    const unsubInvalidated = onStayInvalidated((data) => {
      const msg = data.message || "Your stay has been checked out by reception.";
      if (onStayCheckedOut) {
        onStayCheckedOut(msg);
      } else {
        alert(msg);
      }
      clearStay("Stay access expired or checked out.");
    });

    const unsubConn = subscribeConnectionStatus(setConnStatus);

    return () => {
      unsubInvalidated();
      unsubConn();
    };
  }, [stay?.id, clearStay, onStayCheckedOut]);

  return (
    <StaySessionContext.Provider
      value={{
        stay,
        property,
        authLoading,
        authError,
        connStatus,
        setProperty,
        clearStay,
      }}
    >
      {children}
    </StaySessionContext.Provider>
  );
}

export function useStaySession(): StaySessionContextValue {
  const ctx = useContext(StaySessionContext);
  if (!ctx) {
    throw new Error("useStaySession must be used inside <StaySessionProvider>");
  }
  return ctx;
}
