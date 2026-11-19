import { useEffect, useState } from "react";
import { getPropertySettings } from "./api";

export function usePropertyName(enabled = true) {
  const [propertyName, setPropertyName] = useState<string | null>(null);

  useEffect(() => {
    document.title = propertyName ? `${propertyName} · In-Room Dining` : "In-Room Dining";
  }, [propertyName]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    getPropertySettings()
      .then(({ property }) => {
        if (active) setPropertyName(property.name?.trim() || null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [enabled]);

  return propertyName;
}

export function usePropertyLogo(enabled = true) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const onLogoUpdated = (event: Event) => {
      setLogoUrl((event as CustomEvent<string | null>).detail);
    };
    window.addEventListener("property-logo-updated", onLogoUpdated);
    if (!enabled) return () => window.removeEventListener("property-logo-updated", onLogoUpdated);
    let active = true;
    getPropertySettings()
      .then(({ property }) => {
        if (active) setLogoUrl(property.logoUrl || null);
      })
      .catch(() => {});
    return () => {
      active = false;
      window.removeEventListener("property-logo-updated", onLogoUpdated);
    };
  }, [enabled]);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;
    icon.href = logoUrl || "/cafe-favicon.svg";
    icon.type = logoUrl?.startsWith("data:image/webp") ? "image/webp" : "image/svg+xml";
  }, [logoUrl]);

  return logoUrl;
}
