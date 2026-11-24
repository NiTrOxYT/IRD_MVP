import { Router, Request, Response } from "express";
import { query } from "../db/index.js";
import { settingsSchema } from "../validation.js";
import { requireStaff } from "../auth/middleware.js";

function serializeProperty(row: any) {
  return {
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
    welcomeMode: row.welcome_mode || "every_time",
    welcomeMessage: row.welcome_message ?? null,
    welcomeBgUrl: row.welcome_bg_url ?? null,
  };
}

export function createSettingsRouter(): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await query("SELECT * FROM properties WHERE id = 1");
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Property not found" });
        return;
      }
      res.json({ property: serializeProperty(result.rows[0]) });
    } catch (err) {
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  router.put("/", requireStaff("settings:manage"), async (req: Request, res: Response): Promise<void> => {
    const parse = settingsSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const {
      name,
      currency,
      taxRatePercent,
      serviceChargePercent,
      irdEnabled,
      openingTime,
      closingTime,
      contactNumber,
      logoUrl,
      welcomeMode,
      welcomeMessage,
      welcomeBgUrl,
    } = parse.data;
    const staff = req.staff!;

    try {
      const result = await query(
        `UPDATE properties
         SET name = COALESCE($1, name),
             currency = COALESCE($2, currency),
             tax_rate_percent = COALESCE($3, tax_rate_percent),
             service_charge_percent = COALESCE($4, service_charge_percent),
             ird_enabled = COALESCE($5, ird_enabled),
             opening_time = COALESCE($6, opening_time),
             closing_time = COALESCE($7, closing_time),
             contact_number = COALESCE($8, contact_number),
             logo_url = CASE WHEN $9 THEN $10 ELSE logo_url END,
             welcome_mode = COALESCE($11, welcome_mode),
             welcome_message = CASE WHEN $12 THEN $13 ELSE welcome_message END,
             welcome_bg_url = CASE WHEN $14 THEN $15 ELSE welcome_bg_url END
         WHERE id = 1
         RETURNING *`,
        [
          name,
          currency,
          taxRatePercent,
          serviceChargePercent,
          irdEnabled,
          openingTime,
          closingTime,
          contactNumber,
          logoUrl !== undefined,
          logoUrl,
          welcomeMode,
          welcomeMessage !== undefined,
          welcomeMessage,
          welcomeBgUrl !== undefined,
          welcomeBgUrl,
        ]
      );

      await query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'SETTINGS_UPDATE', 'settings', '1', $4)`,
        [
          staff.propertyId,
          staff.id,
          staff.username,
          JSON.stringify({
            ...parse.data,
            logoUrl: undefined,
            logoUpdated: logoUrl !== undefined,
            welcomeBgUrl: undefined,
            welcomeBgUpdated: welcomeBgUrl !== undefined,
          }),
        ]
      );

      res.json({ success: true, property: serializeProperty(result.rows[0]) });
    } catch (err) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  return router;
}
