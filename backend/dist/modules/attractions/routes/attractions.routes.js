import { Router } from "express";
import { attractionSchema, attractionStatusSchema } from "../validation.js";
function serializeAttraction(row) {
    let media = row.media;
    if (typeof media === "string") {
        try {
            media = JSON.parse(media);
        }
        catch {
            media = [];
        }
    }
    return {
        id: row.id,
        propertyId: row.property_id,
        title: row.title,
        subtitle: row.subtitle,
        category: row.category,
        location: row.location,
        distanceText: row.distance_text,
        description: row.description,
        timings: row.timings,
        rating: Number(row.rating ?? 5),
        cabPrice: row.cab_price !== null && row.cab_price !== undefined ? Number(row.cab_price) : null,
        entryFee: row.entry_fee !== null && row.entry_fee !== undefined ? Number(row.entry_fee) : null,
        packagePrice: row.package_price !== null && row.package_price !== undefined ? Number(row.package_price) : null,
        packageDetails: row.package_details,
        media: Array.isArray(media) ? media : [],
        isFeatured: Boolean(row.is_featured),
        isActive: Boolean(row.is_active),
        sortOrder: Number(row.sort_order ?? 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
export function createAttractionsRouter(deps) {
    const { db, auth } = deps;
    const { requireActiveStay, requireStaff } = auth;
    const router = Router();
    // Guest: Fetch active local attractions for current stay property
    router.get("/guest", requireActiveStay, async (req, res) => {
        const stay = req.stay;
        try {
            const result = await db.query(`SELECT *
         FROM local_attractions
         WHERE property_id = $1 AND is_active = TRUE
         ORDER BY is_featured DESC, sort_order ASC, id ASC`, [stay.propertyId]);
            res.json({ success: true, attractions: result.rows.map(serializeAttraction) });
        }
        catch (err) {
            console.error("[Attractions] Guest fetch error:", err);
            res.status(500).json({ error: "Failed to load local attractions." });
        }
    });
    // Staff/Admin: List all attractions
    router.get("/", requireStaff("attractions:view"), async (req, res) => {
        const propertyId = req.staff.propertyId;
        try {
            const result = await db.query(`SELECT *
         FROM local_attractions
         WHERE property_id = $1
         ORDER BY sort_order ASC, is_featured DESC, id DESC`, [propertyId]);
            res.json({ success: true, attractions: result.rows.map(serializeAttraction) });
        }
        catch (err) {
            console.error("[Attractions] Admin list error:", err);
            res.status(500).json({ error: "Failed to load local attractions." });
        }
    });
    // Staff/Admin: Create attraction
    router.post("/", requireStaff("attractions:create"), async (req, res) => {
        const parse = attractionSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: parse.error.errors[0].message });
            return;
        }
        const d = parse.data;
        const staff = req.staff;
        try {
            const result = await db.query(`INSERT INTO local_attractions (
          property_id, title, subtitle, category, location, distance_text, description, timings,
          rating, cab_price, entry_fee, package_price, package_details, media, is_featured, is_active, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *`, [
                staff.propertyId,
                d.title.trim(),
                d.subtitle?.trim() || null,
                d.category.trim(),
                d.location?.trim() || null,
                d.distanceText?.trim() || null,
                d.description?.trim() || null,
                d.timings?.trim() || null,
                d.rating,
                d.cabPrice ?? null,
                d.entryFee ?? null,
                d.packagePrice ?? null,
                d.packageDetails?.trim() || null,
                JSON.stringify(d.media),
                d.isFeatured,
                d.isActive,
                d.sortOrder,
            ]);
            const created = serializeAttraction(result.rows[0]);
            await db.query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'ATTRACTION_CREATED', 'attraction', $4, $5)`, [staff.propertyId, staff.id, staff.username, String(created.id), JSON.stringify({ title: created.title })]);
            res.status(201).json({ success: true, attraction: created });
        }
        catch (err) {
            console.error("[Attractions] Create error:", err);
            res.status(500).json({ error: "Failed to create local attraction." });
        }
    });
    // Staff/Admin: Update attraction
    router.put("/:id", requireStaff("attractions:edit"), async (req, res) => {
        const id = Number(req.params.id);
        const parse = attractionSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: parse.error.errors[0].message });
            return;
        }
        const d = parse.data;
        const staff = req.staff;
        try {
            const result = await db.query(`UPDATE local_attractions
         SET title = $1,
             subtitle = $2,
             category = $3,
             location = $4,
             distance_text = $5,
             description = $6,
             timings = $7,
             rating = $8,
             cab_price = $9,
             entry_fee = $10,
             package_price = $11,
             package_details = $12,
             media = $13,
             is_featured = $14,
             is_active = $15,
             sort_order = $16,
             updated_at = NOW()
         WHERE id = $17 AND property_id = $18
         RETURNING *`, [
                d.title.trim(),
                d.subtitle?.trim() || null,
                d.category.trim(),
                d.location?.trim() || null,
                d.distanceText?.trim() || null,
                d.description?.trim() || null,
                d.timings?.trim() || null,
                d.rating,
                d.cabPrice ?? null,
                d.entryFee ?? null,
                d.packagePrice ?? null,
                d.packageDetails?.trim() || null,
                JSON.stringify(d.media),
                d.isFeatured,
                d.isActive,
                d.sortOrder,
                id,
                staff.propertyId,
            ]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Local attraction not found." });
                return;
            }
            const updated = serializeAttraction(result.rows[0]);
            await db.query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'ATTRACTION_UPDATED', 'attraction', $4, $5)`, [staff.propertyId, staff.id, staff.username, String(id), JSON.stringify({ title: updated.title })]);
            res.json({ success: true, attraction: updated });
        }
        catch (err) {
            console.error("[Attractions] Update error:", err);
            res.status(500).json({ error: "Failed to update local attraction." });
        }
    });
    // Staff/Admin: Quick toggle active / featured
    router.patch("/:id/status", requireStaff("attractions:edit"), async (req, res) => {
        const id = Number(req.params.id);
        const parse = attractionStatusSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: parse.error.errors[0].message });
            return;
        }
        const { isActive, isFeatured } = parse.data;
        const staff = req.staff;
        try {
            const result = await db.query(`UPDATE local_attractions
         SET is_active = COALESCE($1, is_active),
             is_featured = COALESCE($2, is_featured),
             updated_at = NOW()
         WHERE id = $3 AND property_id = $4
         RETURNING *`, [isActive ?? null, isFeatured ?? null, id, staff.propertyId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Local attraction not found." });
                return;
            }
            res.json({ success: true, attraction: serializeAttraction(result.rows[0]) });
        }
        catch (err) {
            res.status(500).json({ error: "Failed to update attraction status." });
        }
    });
    // Staff/Admin: Delete attraction
    router.delete("/:id", requireStaff("attractions:delete"), async (req, res) => {
        const id = Number(req.params.id);
        const staff = req.staff;
        try {
            const result = await db.query("DELETE FROM local_attractions WHERE id = $1 AND property_id = $2 RETURNING id, title", [id, staff.propertyId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Local attraction not found." });
                return;
            }
            await db.query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'ATTRACTION_DELETED', 'attraction', $4, $5)`, [staff.propertyId, staff.id, staff.username, String(id), JSON.stringify({ title: result.rows[0].title })]);
            res.json({ success: true, message: "Attraction deleted." });
        }
        catch (err) {
            console.error("[Attractions] Delete error:", err);
            res.status(500).json({ error: "Failed to delete local attraction." });
        }
    });
    return router;
}
