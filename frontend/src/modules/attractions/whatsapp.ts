export const DEFAULT_ATTRACTION_WHATSAPP_TEMPLATE =
  "Hello Concierge, I would like to request a booking for {{attraction}} ({{package}}) - {{price}}. Suite {{room}} ({{guest}}).";

export function normalizeWhatsappNumber(raw: string | null | undefined): string {
  const cleaned = (raw || "").trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+")
    ? `+${cleaned.slice(1).replace(/\+/g, "")}`
    : cleaned;
}

export interface AttractionBookingVars {
  attraction: string;
  category?: string | null;
  packageName: string;
  price: string;
  room?: string | null;
  guest?: string | null;
  location?: string | null;
}

export function buildAttractionWhatsappMessage(
  template: string | null | undefined,
  vars: AttractionBookingVars
): string {
  const base = template?.trim() || DEFAULT_ATTRACTION_WHATSAPP_TEMPLATE;
  return base
    .replace(/\{\{\s*(?:attraction|title)\s*\}\}|\{\s*(?:attraction|title)\s*\}/gi, vars.attraction)
    .replace(/\{\{\s*category\s*\}\}|\{\s*category\s*\}/gi, vars.category || "")
    .replace(/\{\{\s*package\s*\}\}|\{\s*package\s*\}/gi, vars.packageName)
    .replace(/\{\{\s*price\s*\}\}|\{\s*price\s*\}/gi, vars.price)
    .replace(/\{\{\s*room\s*\}\}|\{\s*room\s*\}/gi, vars.room || "Guest")
    .replace(/\{\{\s*(?:guest|guest_?name)\s*\}\}|\{\s*(?:guest|guest_?name)\s*\}/gi, vars.guest || "Guest")
    .replace(/\{\{\s*location\s*\}\}|\{\s*location\s*\}/gi, vars.location || "");
}

export function buildAttractionWhatsappUrl(
  whatsappNumber: string | null | undefined,
  template: string | null | undefined,
  vars: AttractionBookingVars
): string | null {
  const num = normalizeWhatsappNumber(whatsappNumber);
  if (!num) return null;
  const text = buildAttractionWhatsappMessage(template, vars);
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
