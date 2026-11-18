import { Router } from "express";
import { query } from "../db/index.js";
import { settingsSchema } from "../lib/validation.js";
import { requireStaff } from "../middleware/auth.js";
const router = Router();
router.get("/", async (_req, res) => {
    try {
        const result = await query("SELECT * FROM properties WHERE id = 1");
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Property not found" });
            return;
        }
        const row = result.rows[0];
        res.json({
            property: {
                id: row.id,
                name: row.name,
                code: row.code,
                currency: row.currency,
                taxRatePercent: Number(row.tax_rate_percent),
                serviceChargePercent: Number(row.service_charge_percent),
                irdEnabled: row.ird_enabled,
                openingTime: row.opening_time,
                closingTime: row.closing_time,
                logoUrl: row.logo_url,
                contactNumber: row.contact_number,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to load settings" });
    }
});
router.put("/", requireStaff(["admin"]), async (req, res) => {
    const parse = settingsSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0].message });
        return;
    }
    const { name, currency, taxRatePercent, serviceChargePercent, irdEnabled, openingTime, closingTime, contactNumber } = parse.data;
    const staff = req.staff;
    try {
        const result = await query(`UPDATE properties
       SET name = COALESCE($1, name),
           currency = COALESCE($2, currency),
           tax_rate_percent = COALESCE($3, tax_rate_percent),
           service_charge_percent = COALESCE($4, service_charge_percent),
           ird_enabled = COALESCE($5, ird_enabled),
           opening_time = COALESCE($6, opening_time),
           closing_time = COALESCE($7, closing_time),
           contact_number = COALESCE($8, contact_number)
       WHERE id = 1
       RETURNING *`, [name, currency, taxRatePercent, serviceChargePercent, irdEnabled, openingTime, closingTime, contactNumber]);
        // Audit log
        await query(`INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
       VALUES ($1, $2, $3, 'SETTINGS_UPDATE', 'settings', '1', $4)`, [staff.propertyId, staff.id, staff.username, JSON.stringify(parse.data)]);
        res.json({ success: true, property: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update settings" });
    }
});
export default router;
