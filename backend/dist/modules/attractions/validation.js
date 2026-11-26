import { z } from "zod";
export const attractionMediaSchema = z.object({
    type: z.enum(["image", "video"]),
    url: z.string().min(1, "Media URL or upload is required").max(8_000_000, "Media asset exceeds size limit"),
    caption: z.string().max(160).optional(),
});
export const attractionPricingOptionSchema = z.object({
    id: z.string().min(1).max(60),
    label: z.string().trim().min(1, "Option name is required").max(80),
    price: z.number().min(0, "Price cannot be negative").nullable().optional(),
    details: z.string().max(300).nullable().optional(),
});
export const attractionSchema = z.object({
    title: z.string().min(2, "Attraction title is required").max(120),
    subtitle: z.string().max(160).nullable().optional(),
    category: z.string().min(1).max(60).default("Sightseeing"),
    location: z.string().max(160).nullable().optional(),
    distanceText: z.string().max(80).nullable().optional(),
    description: z.string().max(2500).nullable().optional(),
    timings: z.string().max(120).nullable().optional(),
    rating: z.number().min(0, "Rating must be between 0 and 5").max(5, "Rating must be between 0 and 5").default(4.8),
    cabPrice: z.number().min(0).nullable().optional(),
    entryFee: z.number().min(0).nullable().optional(),
    packagePrice: z.number().min(0).nullable().optional(),
    packageDetails: z.string().max(300).nullable().optional(),
    pricingOptions: z.array(attractionPricingOptionSchema).max(20).optional(),
    media: z.array(attractionMediaSchema).max(12).default([]),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
});
export const attractionStatusSchema = z.object({
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
});
