import { useEffect, useState } from "react";
import { getPropertySettings } from "./propertyApi";

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
    setPropertyFavicon(logoUrl);
  }, [logoUrl]);

  return logoUrl;
}
