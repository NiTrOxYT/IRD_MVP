import { Router, Request, Response } from "express";
import type { FaqModuleDeps } from "../types.js";
import { faqSchema, faqStatusSchema } from "../validation.js";

function serializeFaq(row: any) {
  return {
    id: row.id,
    propertyId: row.property_id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createFaqRouter(deps: FaqModuleDeps): Router {
  const { db, auth } = deps;
  const { requireActiveStay, requireStaff } = auth;
  const router = Router();

  // Guest: Fetch active FAQs for current stay property
  router.get("/guest", requireActiveStay, async (req: Request, res: Response): Promise<void> => {
    const stay = req.stay!;
    try {
      const result = await db.query(
        `SELECT *
         FROM faqs
         WHERE property_id = $1 AND is_active = TRUE
         ORDER BY sort_order ASC, id ASC`,
        [stay.propertyId]
      );
      res.json({ success: true, faqs: result.rows.map(serializeFaq) });
    } catch (err) {
      console.error("[FAQ] Guest fetch error:", err);
      res.status(500).json({ error: "Failed to load FAQs." });
    }
  });

  // Staff/Admin: List all FAQs
  router.get("/", requireStaff("faq:view"), async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.staff!.propertyId;
    try {
      const result = await db.query(
        `SELECT *
         FROM faqs
         WHERE property_id = $1
         ORDER BY sort_order ASC, id ASC`,
        [propertyId]
      );
      res.json({ success: true, faqs: result.rows.map(serializeFaq) });
    } catch (err) {
      console.error("[FAQ] Admin list error:", err);
      res.status(500).json({ error: "Failed to load FAQs." });
    }
  });

  // Staff/Admin: Create FAQ
  router.post("/", requireStaff("faq:create"), async (req: Request, res: Response): Promise<void> => {
    const parse = faqSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const d = parse.data;
    const staff = req.staff!;

    try {
      const result = await db.query(
        `INSERT INTO faqs (property_id, question, answer, category, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          staff.propertyId,
          d.question.trim(),
          d.answer.trim(),
          d.category.trim(),
          d.sortOrder,
          d.isActive,
        ]
      );

      const created = serializeFaq(result.rows[0]);

      await db.query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'FAQ_CREATED', 'faq', $4, $5)`,
        [staff.propertyId, staff.id, staff.username, String(created.id), JSON.stringify({ question: created.question })]
      );

      res.status(201).json({ success: true, faq: created });
    } catch (err) {
      console.error("[FAQ] Create error:", err);
      res.status(500).json({ error: "Failed to create FAQ." });
    }
  });

  // Staff/Admin: Update FAQ
  router.put("/:id", requireStaff("faq:edit"), async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const parse = faqSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const d = parse.data;
    const staff = req.staff!;

    try {
      const result = await db.query(
        `UPDATE faqs
         SET question = $1,
             answer = $2,
             category = $3,
             sort_order = $4,
             is_active = $5,
             updated_at = NOW()
         WHERE id = $6 AND property_id = $7
         RETURNING *`,
        [
          d.question.trim(),
          d.answer.trim(),
          d.category.trim(),
          d.sortOrder,
          d.isActive,
          id,
          staff.propertyId,
        ]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "FAQ not found." });
        return;
      }

      const updated = serializeFaq(result.rows[0]);

      await db.query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'FAQ_UPDATED', 'faq', $4, $5)`,
        [staff.propertyId, staff.id, staff.username, String(id), JSON.stringify({ question: updated.question })]
      );

      res.json({ success: true, faq: updated });
    } catch (err) {
      console.error("[FAQ] Update error:", err);
      res.status(500).json({ error: "Failed to update FAQ." });
    }
  });

  // Staff/Admin: Toggle FAQ visibility
  router.patch("/:id/status", requireStaff("faq:edit"), async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const parse = faqStatusSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const staff = req.staff!;
    try {
      const result = await db.query(
        `UPDATE faqs
         SET is_active = $1, updated_at = NOW()
         WHERE id = $2 AND property_id = $3
         RETURNING *`,
        [parse.data.isActive, id, staff.propertyId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "FAQ not found." });
        return;
      }

      res.json({ success: true, faq: serializeFaq(result.rows[0]) });
    } catch (err) {
      res.status(500).json({ error: "Failed to update FAQ visibility." });
    }
  });

  // Staff/Admin: Delete FAQ
  router.delete("/:id", requireStaff("faq:delete"), async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const staff = req.staff!;

    try {
      const result = await db.query(
        "DELETE FROM faqs WHERE id = $1 AND property_id = $2 RETURNING id, question",
        [id, staff.propertyId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "FAQ not found." });
        return;
      }

      await db.query(
        `INSERT INTO audit_logs (property_id, staff_user_id, staff_username, action, target_type, target_id, details)
         VALUES ($1, $2, $3, 'FAQ_DELETED', 'faq', $4, $5)`,
        [staff.propertyId, staff.id, staff.username, String(id), JSON.stringify({ question: result.rows[0].question })]
      );

      res.json({ success: true, message: "FAQ deleted." });
    } catch (err) {
      console.error("[FAQ] Delete error:", err);
      res.status(500).json({ error: "Failed to delete FAQ." });
    }
  });

  return router;
}
