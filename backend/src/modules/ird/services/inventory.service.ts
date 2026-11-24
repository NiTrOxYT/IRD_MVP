import type { DbPoolClient } from "../types.js";
import { convertUnitQuantity } from "../units.js";

export interface OrderItemInput {
  menuItemId?: number;
  menu_item_id?: number;
  itemName?: string;
  item_name?: string;
  name?: string;
  quantity: number;
}

/**
 * Deducts both menu item portion inventory and raw material recipe ingredients
 * in a single atomic transaction with row locking and strict idempotency.
 */
export async function deductOrderStock(
  client: DbPoolClient,
  orderId: number,
  orderItems: OrderItemInput[]
): Promise<void> {
  const orderRes = await client.query(
    "SELECT id, inventory_deducted, raw_materials_deducted FROM orders WHERE id = $1 FOR UPDATE",
    [orderId]
  );

  if (orderRes.rows.length === 0) {
    throw new Error(`Order #${orderId} not found`);
  }

  const order = orderRes.rows[0];

  // 1. Portion Inventory Deduction
  if (!order.inventory_deducted) {
    const itemReqMap = new Map<number, number>();

    for (const item of orderItems) {
      const mId = item.menuItemId || item.menu_item_id;
      if (!mId) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      itemReqMap.set(mId, (itemReqMap.get(mId) || 0) + qty);
    }

    if (itemReqMap.size > 0) {
      const itemIds = Array.from(itemReqMap.keys());
      const itemRes = await client.query(
        `SELECT id, name, track_inventory, inventory_quantity, inventory_unit
         FROM menu_items
         WHERE id = ANY($1)
         FOR UPDATE`,
        [itemIds]
      );

      for (const item of itemRes.rows) {
        if (item.track_inventory) {
          const needed = itemReqMap.get(item.id) || 0;
          const current = parseFloat(item.inventory_quantity || "0");
          if (current < needed) {
            const err: any = new Error(
              `Insufficient stock for "${item.name}". Only ${current} ${item.inventory_unit} available, but ${needed} requested.`
            );
            err.status = 400;
            err.code = "INSUFFICIENT_STOCK";
            err.menuItemId = item.id;
            throw err;
          }
        }
      }

      for (const item of itemRes.rows) {
        if (item.track_inventory) {
          const needed = itemReqMap.get(item.id) || 0;
          const current = parseFloat(item.inventory_quantity || "0");
          const newBalance = Math.round((current - needed) * 100) / 100;

          await client.query(
            "UPDATE menu_items SET inventory_quantity = $1 WHERE id = $2",
            [newBalance, item.id]
          );

          await client.query(
            `INSERT INTO inventory_movements (
              menu_item_id, movement_type, quantity, balance_after, unit, reason, order_id, performed_by, created_at
            ) VALUES ($1, 'order_deduction', $2, $3, $4, $5, $6, 'order_system', NOW())`,
            [
              item.id,
              needed,
              newBalance,
              item.inventory_unit,
              `Order #${orderId}`,
              orderId,
            ]
          );
        }
      }
    }

    await client.query(
      "UPDATE orders SET inventory_deducted = TRUE WHERE id = $1",
      [orderId]
    );
  }

  // 2. Raw Material Recipe Ingredients Deduction
  if (!order.raw_materials_deducted) {
    const rmReqMap = new Map<
      number,
      { rawMaterialId: number; baseQuantity: number; itemBreakdown: string[] }
    >();

    for (const item of orderItems) {
      const mId = item.menuItemId || item.menu_item_id;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const itemName = (item.itemName || item.item_name || item.name || `Item #${mId}`).trim();

      if (!mId) continue;

      const recipeRes = await client.query(
        `SELECT mir.raw_material_id, mir.quantity, mir.unit, r.name AS rm_name, r.base_unit
         FROM menu_item_recipes mir
         JOIN raw_materials r ON mir.raw_material_id = r.id
         WHERE mir.menu_item_id = $1 AND r.is_archived = false`,
        [mId]
      );

      if (recipeRes.rows.length === 0) continue;

      for (const rec of recipeRes.rows) {
        const baseQtyPerServing = convertUnitQuantity(
          parseFloat(rec.quantity),
          rec.unit,
          rec.base_unit
        );
        const totalBaseQty = baseQtyPerServing * qty;

        const existing = rmReqMap.get(rec.raw_material_id);
        if (existing) {
          existing.baseQuantity += totalBaseQty;
          existing.itemBreakdown.push(`${itemName} x${qty}`);
        } else {
          rmReqMap.set(rec.raw_material_id, {
            rawMaterialId: rec.raw_material_id,
            baseQuantity: totalBaseQty,
            itemBreakdown: [`${itemName} x${qty}`],
          });
        }
      }
    }

    if (rmReqMap.size > 0) {
      const rmIds = Array.from(rmReqMap.keys());
      const rmRes = await client.query(
        `SELECT id, name, base_unit, current_stock FROM raw_materials WHERE id = ANY($1) FOR UPDATE`,
        [rmIds]
      );

      for (const rm of rmRes.rows) {
        const req = rmReqMap.get(rm.id);
        if (!req) continue;

        const currentStock = parseFloat(rm.current_stock || "0");
        if (currentStock < req.baseQuantity) {
          const err: any = new Error(
            `Insufficient raw material stock for "${rm.name}". Need ${req.baseQuantity} ${rm.base_unit}, but only ${currentStock} ${rm.base_unit} available.`
          );
          err.status = 400;
          err.code = "INSUFFICIENT_RAW_MATERIAL_STOCK";
          err.rawMaterialId = rm.id;
          throw err;
        }
      }

      for (const rm of rmRes.rows) {
        const req = rmReqMap.get(rm.id);
        if (!req) continue;

        const currentStock = parseFloat(rm.current_stock || "0");
        const newBalance = Math.round((currentStock - req.baseQuantity) * 1000) / 1000;

        await client.query(
          "UPDATE raw_materials SET current_stock = $1, updated_at = NOW() WHERE id = $2",
          [newBalance, rm.id]
        );

        await client.query(
          `INSERT INTO raw_material_movements (
            raw_material_id, movement_type, quantity, unit, base_quantity,
            balance_before, balance_after, reason, order_id, performed_by, created_at
          ) VALUES ($1, 'recipe_consumption', $2, $3, $4, $5, $6, $7, $8, 'order_system', NOW())`,
          [
            rm.id,
            req.baseQuantity,
            rm.base_unit,
            req.baseQuantity,
            currentStock,
            newBalance,
            `Recipe consumption for Order #${orderId} (${req.itemBreakdown.join(", ")})`,
            orderId,
          ]
        );
      }
    }

    await client.query(
      "UPDATE orders SET raw_materials_deducted = TRUE WHERE id = $1",
      [orderId]
    );
  }
}

/**
 * Reverses both portion inventory and raw material deductions when an order is cancelled or rejected.
 */
export async function reverseOrderStock(
  client: DbPoolClient,
  orderId: number,
  performedBy: string = "order_cancellation"
): Promise<void> {
  const orderRes = await client.query(
    "SELECT id, inventory_deducted, raw_materials_deducted FROM orders WHERE id = $1 FOR UPDATE",
    [orderId]
  );

  if (orderRes.rows.length === 0) return;
  const order = orderRes.rows[0];

  if (order.inventory_deducted) {
    const movRes = await client.query(
      `SELECT im.menu_item_id, im.quantity, m.name, m.inventory_unit, m.inventory_quantity
       FROM inventory_movements im
       JOIN menu_items m ON im.menu_item_id = m.id
       WHERE im.order_id = $1 AND im.movement_type = 'order_deduction'
       FOR UPDATE OF m`,
      [orderId]
    );

    for (const mov of movRes.rows) {
      const returnQty = parseFloat(mov.quantity || "0");
      const current = parseFloat(mov.inventory_quantity || "0");
      const newBalance = Math.round((current + returnQty) * 100) / 100;

      await client.query(
        "UPDATE menu_items SET inventory_quantity = $1 WHERE id = $2",
        [newBalance, mov.menu_item_id]
      );

      await client.query(
        `INSERT INTO inventory_movements (
          menu_item_id, movement_type, quantity, balance_after, unit, reason, order_id, performed_by, created_at
        ) VALUES ($1, 'order_reversal', $2, $3, $4, $5, $6, $7, NOW())`,
        [
          mov.menu_item_id,
          returnQty,
          newBalance,
          mov.inventory_unit,
          `Reversal for cancelled/rejected Order #${orderId}`,
          orderId,
          performedBy,
        ]
      );
    }

    await client.query(
      "UPDATE orders SET inventory_deducted = FALSE WHERE id = $1",
      [orderId]
    );
  }

  if (order.raw_materials_deducted) {
    const rmMovRes = await client.query(
      `SELECT rmm.raw_material_id, rmm.base_quantity, r.name, r.base_unit, r.current_stock
       FROM raw_material_movements rmm
       JOIN raw_materials r ON rmm.raw_material_id = r.id
       WHERE rmm.order_id = $1 AND rmm.movement_type = 'recipe_consumption'
       FOR UPDATE OF r`,
      [orderId]
    );

    for (const mov of rmMovRes.rows) {
      const currentStock = parseFloat(mov.current_stock || "0");
      const returnQty = parseFloat(mov.base_quantity || "0");
      const newBalance = Math.round((currentStock + returnQty) * 1000) / 1000;

      await client.query(
        "UPDATE raw_materials SET current_stock = $1, updated_at = NOW() WHERE id = $2",
        [newBalance, mov.raw_material_id]
      );

      await client.query(
        `INSERT INTO raw_material_movements (
          raw_material_id, movement_type, quantity, unit, base_quantity,
          balance_before, balance_after, reason, order_id, performed_by, created_at
        ) VALUES ($1, 'order_reversal', $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          mov.raw_material_id,
          returnQty,
          mov.base_unit,
          returnQty,
          currentStock,
          newBalance,
          `Reversal for cancelled/rejected Order #${orderId}`,
          orderId,
          performedBy,
        ]
      );
    }

    await client.query(
      "UPDATE orders SET raw_materials_deducted = FALSE WHERE id = $1",
      [orderId]
    );
  }
}
