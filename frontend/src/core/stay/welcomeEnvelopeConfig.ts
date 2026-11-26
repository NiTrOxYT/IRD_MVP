import { gsap } from "../ui/gsap";

export interface WelcomeEnvelopeTimingConfig {
  autoPlayDelay: number;
  sealBreakDuration: number;
  flapOpenDuration: number;
  letterRiseDuration: number;
  envelopeSettleDuration: number;
  salutationDelay: number;
  salutationCharStagger: number;
  salutationCharDuration: number;
  bodyCharStagger: number;
  bodyCharDuration: number;
  signatureDelay: number;
  signatureCharStagger: number;
  signatureCharDuration: number;
  ctaRevealDuration: number;
  exitDuration: number;
}

export const WELCOME_ENVELOPE_CONFIG_PATH = "/config/welcome-envelope-animation.xml";

export const DEFAULT_ENVELOPE_TIMING: WelcomeEnvelopeTimingConfig = {
  autoPlayDelay: 0.35,
  sealBreakDuration: 0.22,
  flapOpenDuration: 0.62,
  letterRiseDuration: 0.85,
  envelopeSettleDuration: 0.72,
  salutationDelay: 0.04,
  salutationCharStagger: 0.02,
  salutationCharDuration: 0.4,
  bodyCharStagger: 0.006,
  bodyCharDuration: 0.36,
  signatureDelay: 0.08,
  signatureCharStagger: 0.022,
  signatureCharDuration: 0.55,
  ctaRevealDuration: 0.4,
  exitDuration: 0.32,
};

function readXmlNumber(
  doc: Document,
  tagName: keyof WelcomeEnvelopeTimingConfig,
  min: number,
  max: number
): number {
  const raw = doc.getElementsByTagName(tagName)[0]?.textContent?.trim();
  const parsed = raw !== undefined ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ENVELOPE_TIMING[tagName];
  }
  return gsap.utils.clamp(min, max, parsed);
}

export function parseWelcomeEnvelopeTimingXml(xmlText: string): WelcomeEnvelopeTimingConfig {
  if (typeof DOMParser === "undefined") {
    return DEFAULT_ENVELOPE_TIMING;
  }
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    return DEFAULT_ENVELOPE_TIMING;
  }

  return {
    autoPlayDelay: readXmlNumber(doc, "autoPlayDelay", 0, 10),
    sealBreakDuration: readXmlNumber(doc, "sealBreakDuration", 0.05, 5),
    flapOpenDuration: readXmlNumber(doc, "flapOpenDuration", 0.1, 5),
    letterRiseDuration: readXmlNumber(doc, "letterRiseDuration", 0.1, 5),
    envelopeSettleDuration: readXmlNumber(doc, "envelopeSettleDuration", 0.1, 5),
    salutationDelay: readXmlNumber(doc, "salutationDelay", 0, 5),
    salutationCharStagger: readXmlNumber(doc, "salutationCharStagger", 0.002, 0.5),
    salutationCharDuration: readXmlNumber(doc, "salutationCharDuration", 0.05, 3),
    bodyCharStagger: readXmlNumber(doc, "bodyCharStagger", 0.002, 0.3),
    bodyCharDuration: readXmlNumber(doc, "bodyCharDuration", 0.05, 3),
    signatureDelay: readXmlNumber(doc, "signatureDelay", 0, 5),
    signatureCharStagger: readXmlNumber(doc, "signatureCharStagger", 0.002, 0.5),
    signatureCharDuration: readXmlNumber(doc, "signatureCharDuration", 0.05, 3),
    ctaRevealDuration: readXmlNumber(doc, "ctaRevealDuration", 0.05, 3),
    exitDuration: readXmlNumber(doc, "exitDuration", 0.05, 3),
  };
}

export async function loadWelcomeEnvelopeTiming(): Promise<WelcomeEnvelopeTimingConfig> {
  try {
    const res = await fetch(`${WELCOME_ENVELOPE_CONFIG_PATH}?v=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return DEFAULT_ENVELOPE_TIMING;
    const text = await res.text();
    return parseWelcomeEnvelopeTimingXml(text);
  } catch {
    return DEFAULT_ENVELOPE_TIMING;
  }
}
