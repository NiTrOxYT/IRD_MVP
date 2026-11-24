import { z } from "zod";
export const faqSchema = z.object({
    question: z.string().min(3, "Question must be at least 3 characters").max(300),
    answer: z.string().min(2, "Answer is required").max(4000),
    category: z.string().min(1).max(60).default("General"),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
});
export const faqStatusSchema = z.object({
    isActive: z.boolean(),
});
