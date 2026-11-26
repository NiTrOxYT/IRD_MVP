import { useEffect, useState } from "react";
import { getPropertySettings } from "./propertyApi";

const BRANDING_CACHE_KEY = "ird_property_branding_v1";

interface CachedBranding {
  propertyName: string | null;
  contactNumber: string | null;
  logoUrl: string | null;
  suiteLoaderBgUrl: string | null;
}

function readCachedBranding(): CachedBranding | null {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      propertyName: typeof parsed?.propertyName === "string" ? parsed.propertyName : null,
      contactNumber: typeof parsed?.contactNumber === "string" ? parsed.contactNumber : null,
      logoUrl: typeof parsed?.logoUrl === "string" ? parsed.logoUrl : null,
      suiteLoaderBgUrl: typeof parsed?.suiteLoaderBgUrl === "string" ? parsed.suiteLoaderBgUrl : null,
    };
  } catch {
    return null;
  }
}

export function writeCachedBranding(patch: Partial<CachedBranding>) {
  try {
    const current = readCachedBranding() || {
      propertyName: null,
      contactNumber: null,
      logoUrl: null,
      suiteLoaderBgUrl: null,
    };
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // Ignore storage quota errors on very large data URLs
  }
}

export function setPropertyFavicon(logoUrl: string | null) {
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!icon) return;

  if (!logoUrl) {
    icon.type = "image/svg+xml";
    icon.href = "/cafe-favicon.svg";
    return;
  }

  icon.removeAttribute("type");
  icon.href = logoUrl;
  if (!logoUrl.startsWith("data:image/webp")) return;

  icon.dataset.logoSource = logoUrl;
  const image = new Image();
  image.onload = () => {
    if (icon.dataset.logoSource !== logoUrl) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = Math.min(128 / image.naturalWidth, 128 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (128 - width) / 2, (128 - height) / 2, width, height);
    icon.type = "image/png";
    icon.href = canvas.toDataURL("image/png");
  };
  image.src = logoUrl;
}

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

export function usePropertyBranding(enabled = true) {
  const initialCache = typeof window !== "undefined" ? readCachedBranding() : null;
  const [propertyName, setPropertyName] = useState<string | null>(initialCache?.propertyName ?? null);
  const [contactNumber, setContactNumber] = useState<string | null>(initialCache?.contactNumber ?? null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialCache?.logoUrl ?? null);
  const [suiteLoaderBgUrl, setSuiteLoaderBgUrl] = useState<string | null>(
    initialCache?.suiteLoaderBgUrl ?? null
  );
  const [brandingReady, setBrandingReady] = useState<boolean>(Boolean(initialCache));

  useEffect(() => {
    const onLogoUpdated = (event: Event) => {
      const nextLogo = (event as CustomEvent<string | null>).detail;
      setLogoUrl(nextLogo);
      writeCachedBranding({ logoUrl: nextLogo });
    };
    const onBrandingUpdated = (event: Event) => {
      const patch = (event as CustomEvent<Partial<CachedBranding>>).detail;
      if (patch.propertyName !== undefined) setPropertyName(patch.propertyName);
      if (patch.contactNumber !== undefined) setContactNumber(patch.contactNumber);
      if (patch.logoUrl !== undefined) setLogoUrl(patch.logoUrl);
      if (patch.suiteLoaderBgUrl !== undefined) setSuiteLoaderBgUrl(patch.suiteLoaderBgUrl);
      writeCachedBranding(patch);
      setBrandingReady(true);
    };

    window.addEventListener("property-logo-updated", onLogoUpdated);
    window.addEventListener("property-branding-updated", onBrandingUpdated);
    if (!enabled) {
      return () => {
        window.removeEventListener("property-logo-updated", onLogoUpdated);
        window.removeEventListener("property-branding-updated", onBrandingUpdated);
      };
    }

    let active = true;
    getPropertySettings()
      .then(({ property }) => {
        if (!active) return;
        const nextName = property.name?.trim() || null;
        const nextContact = property.contactNumber?.trim() || null;
        const nextLogo = property.logoUrl || null;
        const nextLoaderBg = property.suiteLoaderBgUrl || null;
        setPropertyName(nextName);
        setContactNumber(nextContact);
        setLogoUrl(nextLogo);
        setSuiteLoaderBgUrl(nextLoaderBg);
        writeCachedBranding({
          propertyName: nextName,
          contactNumber: nextContact,
          logoUrl: nextLogo,
          suiteLoaderBgUrl: nextLoaderBg,
        });
        setBrandingReady(true);
      })
      .catch(() => {
        if (active) setBrandingReady(true);
      });

    return () => {
      active = false;
      window.removeEventListener("property-logo-updated", onLogoUpdated);
      window.removeEventListener("property-branding-updated", onBrandingUpdated);
    };
  }, [enabled]);

  useEffect(() => {
    setPropertyFavicon(logoUrl);
  }, [logoUrl]);

  return { propertyName, contactNumber, logoUrl, suiteLoaderBgUrl, brandingReady };
}

export function usePropertyLogo(enabled = true) {
  return usePropertyBranding(enabled).logoUrl;
}
