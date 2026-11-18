import { z } from "zod";
export const createStaySchema = z.object({
    roomId: z.number().int().positive("Valid room required"),
    guestName: z.string().min(2, "Guest name must be at least 2 characters"),
    guestPhone: z.string().optional(),
    notes: z.string().optional(),
});
export const orderItemSchema = z.object({
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Max 50 per item"),
    modifierIds: z.array(z.number().int().positive()).optional().default([]),
    notes: z.string().max(200).optional(),
});
export const createOrderSchema = z.object({
    items: z.array(orderItemSchema).min(1, "Order must contain at least 1 item"),
    specialInstructions: z.string().max(500).optional(),
});
export const updateOrderStatusSchema = z.object({
    status: z.enum([
        "pending",
        "accepted",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "rejected",
        "cancelled",
    ]),
    rejectionReason: z.string().optional(),
});
export const categorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
});
export const menuItemSchema = z.object({
    categoryId: z.number().int().positive(),
    name: z.string().min(1, "Item name is required"),
    description: z.string().optional(),
    price: z.number().min(0, "Price must be non-negative"),
    imageUrl: z.string().url().or(z.literal("")).optional(),
    dietaryFlags: z.array(z.string()).default([]),
    available: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
    prepTimeMinutes: z.number().int().min(1).default(20),
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
});
