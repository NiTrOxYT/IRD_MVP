import { z } from "zod";

export const INBOX_CATEGORIES = ["Notice", "Offer", "Event", "Alert", "Concierge"] as const;

export const createInboxMessageSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(120, "Title cannot exceed 120 characters"),
    body: z.string().trim().min(2, "Message body is required").max(2000, "Message body cannot exceed 2000 characters"),
    category: z.enum(INBOX_CATEGORIES).default("Notice"),
    targetType: z.enum(["all", "rooms"]).default("all"),
    targetRoomIds: z.array(z.coerce.number().int().positive()).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "rooms" && data.targetRoomIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetRoomIds"],
        message: "Select at least one room when targeting specific rooms.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    targetRoomIds: data.targetType === "all" ? [] : Array.from(new Set(data.targetRoomIds)),
  }));

export const inboxStatusSchema = z.object({
  isActive: z.boolean(),
});
