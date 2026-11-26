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
    whatsappNumber: row.whatsapp_number ?? null,
    attractionBookingTemplate: row.attraction_booking_template ?? null,
    welcomeMode: row.welcome_mode || "every_time",
    welcomeMessage: row.welcome_message ?? null,
    welcomeBgUrl: row.welcome_bg_url ?? null,
    diningHeroUrl: row.dining_hero_url ?? null,
    roomServiceHeroUrl: row.room_service_hero_url ?? null,
    attractionsHeroUrl: row.attractions_hero_url ?? null,
    suiteLoaderBgUrl: row.suite_loader_bg_url ?? null,
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
      whatsappNumber,
      attractionBookingTemplate,
      logoUrl,
      welcomeMode,
      welcomeMessage,
      welcomeBgUrl,
      diningHeroUrl,
      roomServiceHeroUrl,
      attractionsHeroUrl,
      suiteLoaderBgUrl,
    } = parse.data;
    const staff = req.staff!;
    const cleanWhatsappNumber =
      whatsappNumber === undefined ? undefined : whatsappNumber?.trim() || null;
    const cleanBookingTemplate =
      attractionBookingTemplate === undefined ? undefined : attractionBookingTemplate?.trim() || null;

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
             welcome_bg_url = CASE WHEN $14 THEN $15 ELSE welcome_bg_url END,
             whatsapp_number = CASE WHEN $16 THEN $17 ELSE whatsapp_number END,
             attraction_booking_template = CASE WHEN $18 THEN $19 ELSE attraction_booking_template END,
             dining_hero_url = CASE WHEN $20 THEN $21 ELSE dining_hero_url END,
             room_service_hero_url = CASE WHEN $22 THEN $23 ELSE room_service_hero_url END,
             attractions_hero_url = CASE WHEN $24 THEN $25 ELSE attractions_hero_url END,
             suite_loader_bg_url = CASE WHEN $26 THEN $27 ELSE suite_loader_bg_url END
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
          cleanWhatsappNumber !== undefined,
          cleanWhatsappNumber ?? null,
          cleanBookingTemplate !== undefined,
          cleanBookingTemplate ?? null,
          diningHeroUrl !== undefined,
          diningHeroUrl,
          roomServiceHeroUrl !== undefined,
          roomServiceHeroUrl,
          attractionsHeroUrl !== undefined,
          attractionsHeroUrl,
          suiteLoaderBgUrl !== undefined,
          suiteLoaderBgUrl,
        ]
      );

      if (diningHeroUrl !== undefined) {
        await query(
          `UPDATE ird_hero_cards
           SET image_url = $1, updated_at = NOW()
           WHERE id = (
             SELECT id FROM ird_hero_cards WHERE property_id = 1 ORDER BY sort_order ASC, id ASC LIMIT 1
           )`,
          [diningHeroUrl]
        ).catch(() => {});
      }

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
            diningHeroUrl: undefined,
            diningHeroUpdated: diningHeroUrl !== undefined,
            roomServiceHeroUrl: undefined,
            roomServiceHeroUpdated: roomServiceHeroUrl !== undefined,
            attractionsHeroUrl: undefined,
            attractionsHeroUpdated: attractionsHeroUrl !== undefined,
            suiteLoaderBgUrl: undefined,
            suiteLoaderBgUpdated: suiteLoaderBgUrl !== undefined,
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
