import { z } from "zod";
export const createStaySchema = z.object({
    roomId: z.number().int().positive("Valid room required"),
    guestName: z.string().min(2, "Guest name must be at least 2 characters"),
    guestPhone: z.string().optional(),
    notes: z.string().optional(),
});
export const settingsSchema = z.object({
    name: z.string().min(1).optional(),
    currency: z.string().min(1).max(5).optional(),
    taxRatePercent: z.number().min(0).max(100).optional(),
    serviceChargePercent: z.number().min(0).max(100).optional(),
    irdEnabled: z.boolean().optional(),
    openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    contactNumber: z.string().optional(),
    whatsappNumber: z
        .string()
        .max(32)
        .refine((v) => v.trim() === "" || /^\+?[0-9\s\-()]{7,25}$/.test(v.trim()), "Enter a valid WhatsApp number with country code (e.g. +918100318327)")
        .nullable()
        .optional(),
    attractionBookingTemplate: z.string().max(1000).nullable().optional(),
    logoUrl: z.string().max(70_000).nullable().optional(),
    welcomeMode: z.enum(["every_time", "once_per_stay", "disabled"]).optional(),
    welcomeMessage: z.string().max(4000).nullable().optional(),
    welcomeBgUrl: z.string().max(750_000).nullable().optional(),
    diningHeroUrl: z.string().max(750_000).nullable().optional(),
    roomServiceHeroUrl: z.string().max(750_000).nullable().optional(),
    attractionsHeroUrl: z.string().max(750_000).nullable().optional(),
    suiteLoaderBgUrl: z.string().max(750_000).nullable().optional(),
    landingVideoUrl: z
        .string()
        .max(9_000_000, "Video upload exceeds 5.5 MB limit (use an MP4/WebM file or paste a URL)")
        .refine((v) => v === "" ||
        v.startsWith("/") ||
        v.startsWith("https://") ||
        v.startsWith("http://") ||
        v.startsWith("data:video/"), "Upload an MP4/WebM/MOV video or enter a valid https:// video URL")
        .nullable()
        .optional(),
});
