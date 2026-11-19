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
