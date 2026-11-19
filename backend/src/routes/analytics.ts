import { Router, Request, Response } from "express";
import { query } from "../db/index.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

const analyticsNow = "(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')";
const analyticsToday = `(${analyticsNow}::date)`;
const analyticsCreatedAt = "(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')";

const currentRangeSql: Record<string, string> = {
  today: `${analyticsCreatedAt} >= ${analyticsToday}`,
  yesterday: `${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '1 day' AND ${analyticsCreatedAt} < ${analyticsToday}`,
  "7d": `${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '6 days'`,
  "30d": `${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '29 days'`,
  thisMonth: `${analyticsCreatedAt} >= DATE_TRUNC('month', ${analyticsToday})`,
  prevMonth: `${analyticsCreatedAt} >= DATE_TRUNC('month', ${analyticsToday}) - INTERVAL '1 month' AND ${analyticsCreatedAt} < DATE_TRUNC('month', ${analyticsToday})`,
  all: "TRUE",
};

const previousRangeSql: Partial<Record<string, string>> = {
  today: `${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '1 day' AND ${analyticsCreatedAt} < ${analyticsToday} - INTERVAL '1 day' + (${analyticsNow} - ${analyticsToday})`,
  yesterday: `${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '2 days' AND ${analyticsCreatedAt} < ${analyticsToday} - INTERVAL '1 day'`,
  "7d": `${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '13 days' AND ${analyticsCreatedAt} < ${analyticsToday} - INTERVAL '6 days'`,
  "30d": `${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '59 days' AND ${analyticsCreatedAt} < ${analyticsToday} - INTERVAL '29 days'`,
  thisMonth: `${analyticsCreatedAt} >= DATE_TRUNC('month', ${analyticsToday}) - INTERVAL '1 month' AND ${analyticsCreatedAt} < LEAST(DATE_TRUNC('month', ${analyticsToday}), DATE_TRUNC('month', ${analyticsToday}) - INTERVAL '1 month' + ((${analyticsToday} - DATE_TRUNC('month', ${analyticsToday})::date + 1) * INTERVAL '1 day'))`,
  prevMonth: `${analyticsCreatedAt} >= DATE_TRUNC('month', ${analyticsToday}) - INTERVAL '2 months' AND ${analyticsCreatedAt} < DATE_TRUNC('month', ${analyticsToday}) - INTERVAL '1 month'`,
};

const billableStatusSql = "status NOT IN ('cancelled', 'rejected')";

router.get("/", requireStaff("analytics:view"), async (req: Request, res: Response): Promise<void> => {
  const range = typeof req.query.range === "string" && currentRangeSql[req.query.range]
    ? req.query.range
    : "7d";
  const propertyId = req.staff!.propertyId;
  const currentFilter = currentRangeSql[range];
  const previousFilter = previousRangeSql[range];

  try {
    const [summaryRes, staysRes, trendRes, statusRes, hoursRes, roomsRes, categoriesRes, itemsRes, highOrdersRes, comparisonRes] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS "orderCount",
           COUNT(*) FILTER (WHERE ${billableStatusSql})::int AS "billableOrderCount",
           COUNT(*) FILTER (WHERE status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'))::int AS "activeOrderCount",
           COUNT(*) FILTER (WHERE status = 'delivered')::int AS "completedOrderCount",
           COUNT(*) FILTER (WHERE status IN ('cancelled', 'rejected'))::int AS "cancelledOrderCount",
           COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue,
           COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery')), 0) AS "activeValue",
           COALESCE(SUM(total_amount) FILTER (WHERE status IN ('cancelled', 'rejected')), 0) AS "cancelledValue",
           COALESCE(AVG(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS "averageOrderValue",
           COALESCE((SELECT AVG(item_count) FROM (
             SELECT COALESCE(SUM(oi.quantity), 0)::numeric AS item_count
             FROM orders so JOIN order_items oi ON oi.order_id = so.id
             WHERE so.property_id = $1 AND ${currentFilter.replaceAll("created_at", "so.created_at")}
               AND so.status NOT IN ('cancelled', 'rejected')
             GROUP BY so.id
           ) item_counts), 0) AS "averageItems",
           COALESCE(SUM(total_amount) FILTER (WHERE ${analyticsCreatedAt} >= ${analyticsToday} AND ${billableStatusSql}), 0) AS "todayRevenue",
           COALESCE(SUM(total_amount) FILTER (WHERE ${analyticsCreatedAt} >= ${analyticsToday} - INTERVAL '1 day' AND ${analyticsCreatedAt} < ${analyticsToday} AND ${billableStatusSql}), 0) AS "yesterdayRevenue"
         FROM orders
         WHERE property_id = $1 AND ${currentFilter}`,
        [propertyId]
      ),
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE order_count > 1)::int AS returning,
                COUNT(*) FILTER (WHERE order_count = 1)::int AS new
         FROM (
           SELECT stay_id, COUNT(*) AS order_count
           FROM orders
           WHERE property_id = $1 AND ${currentFilter} AND ${billableStatusSql}
           GROUP BY stay_id
         ) stay_orders`,
        [propertyId]
      ),
      query(
        `WITH buckets AS (
           SELECT generate_series(
             ${range === "today"
               ? `DATE_TRUNC('day', ${analyticsNow})`
               : range === "yesterday"
                 ? `DATE_TRUNC('day', ${analyticsNow}) - INTERVAL '1 day'`
                 : range === "7d"
                   ? `${analyticsToday} - INTERVAL '6 days'`
                   : range === "30d"
                     ? `${analyticsToday} - INTERVAL '29 days'`
                     : range === "thisMonth"
                       ? `DATE_TRUNC('month', ${analyticsToday})`
                       : range === "prevMonth"
                         ? `DATE_TRUNC('month', ${analyticsToday}) - INTERVAL '1 month'`
                         : `DATE_TRUNC('week', COALESCE((SELECT MIN(${analyticsCreatedAt}) FROM orders WHERE property_id = $1), ${analyticsToday}))`},
             ${range === "today"
               ? `DATE_TRUNC('day', ${analyticsNow}) + INTERVAL '23 hours'`
               : range === "yesterday"
                 ? `DATE_TRUNC('day', ${analyticsNow}) - INTERVAL '1 hour'`
                 : range === "7d" || range === "30d" || range === "thisMonth"
                   ? analyticsToday
                   : range === "prevMonth"
                     ? `DATE_TRUNC('month', ${analyticsToday}) - INTERVAL '1 day'`
                     : `DATE_TRUNC('week', ${analyticsToday})`},
             INTERVAL '${range === "today" || range === "yesterday" ? "1 hour" : range === "all" ? "1 week" : "1 day"}'
           ) AS bucket
         ), order_metrics AS (
           SELECT ${range === "today" || range === "yesterday" ? `DATE_TRUNC('hour', ${analyticsCreatedAt})` : range === "all" ? `DATE_TRUNC('week', ${analyticsCreatedAt})` : `DATE_TRUNC('day', ${analyticsCreatedAt})`} AS bucket,
                  COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue,
                  COUNT(*)::int AS orders
           FROM orders
           WHERE property_id = $1 AND ${currentFilter}
           GROUP BY 1
         )
         SELECT buckets.bucket,
                TO_CHAR(buckets.bucket, '${range === "today" || range === "yesterday" ? "HH12:MI AM" : range === "all" ? "DD Mon YYYY" : "DD Mon"}') AS label,
                COALESCE(order_metrics.revenue, 0) AS revenue,
                COALESCE(order_metrics.orders, 0)::int AS orders
         FROM buckets LEFT JOIN order_metrics USING (bucket)
         ORDER BY buckets.bucket`,
        [propertyId]
      ),
      query(
        `SELECT status, COUNT(*)::int AS count
         FROM orders WHERE property_id = $1 AND ${currentFilter}
         GROUP BY status ORDER BY count DESC`,
        [propertyId]
      ),
      query(
        `SELECT EXTRACT(HOUR FROM ${analyticsCreatedAt})::int AS hour, COUNT(*)::int AS orders
         FROM orders WHERE property_id = $1 AND ${currentFilter}
         GROUP BY hour ORDER BY hour`,
        [propertyId]
      ),
      query(
        `SELECT room_number AS room,
                COUNT(*)::int AS orders,
                COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue
         FROM orders WHERE property_id = $1 AND ${currentFilter} AND ${billableStatusSql}
         GROUP BY room_number ORDER BY revenue DESC LIMIT 5`,
        [propertyId]
      ),
      query(
        `SELECT COALESCE(c.name, 'Other') AS name,
                COUNT(DISTINCT oi.order_id)::int AS orders,
                COALESCE(SUM(oi.line_total) FILTER (WHERE ${billableStatusSql.replaceAll("status", "o.status")}), 0) AS revenue
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
         LEFT JOIN menu_categories c ON c.id = mi.category_id
         WHERE o.property_id = $1 AND ${currentFilter.replaceAll("created_at", "o.created_at")}
           AND o.status NOT IN ('cancelled', 'rejected')
         GROUP BY c.name ORDER BY revenue DESC`,
        [propertyId]
      ),
      query(
        `SELECT oi.item_name AS name,
                SUM(oi.quantity)::int AS quantity,
                COUNT(DISTINCT oi.order_id)::int AS orders,
                COALESCE(SUM(oi.line_total) FILTER (WHERE ${billableStatusSql.replaceAll("status", "o.status")}), 0) AS revenue
         FROM orders o JOIN order_items oi ON oi.order_id = o.id
         WHERE o.property_id = $1 AND ${currentFilter.replaceAll("created_at", "o.created_at")}
           AND o.status NOT IN ('cancelled', 'rejected')
         GROUP BY oi.item_name ORDER BY revenue DESC LIMIT 8`,
        [propertyId]
      ),
      query(
        `SELECT id, order_number AS "orderNumber", room_number AS room,
                guest_name AS "guestName", status, total_amount AS total,
                created_at AS "createdAt"
         FROM orders WHERE property_id = $1 AND ${currentFilter} AND ${billableStatusSql}
         ORDER BY total_amount DESC LIMIT 5`,
        [propertyId]
      ),
      previousFilter
        ? query(
            `SELECT COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue
             FROM orders WHERE property_id = $1 AND ${previousFilter}`,
            [propertyId]
          )
        : Promise.resolve({ rows: [{ revenue: 0 }] }),
    ]);

    const summary = summaryRes.rows[0];
    const stays = staysRes.rows[0];
    const revenue = Number(summary.revenue || 0);
    const previousRevenue = Number(comparisonRes.rows[0]?.revenue || 0);

    res.json({
      range,
      summary: {
        orderCount: Number(summary.orderCount || 0),
        billableOrderCount: Number(summary.billableOrderCount || 0),
        activeOrderCount: Number(summary.activeOrderCount || 0),
        completedOrderCount: Number(summary.completedOrderCount || 0),
        cancelledOrderCount: Number(summary.cancelledOrderCount || 0),
        revenue,
        activeValue: Number(summary.activeValue || 0),
        cancelledValue: Number(summary.cancelledValue || 0),
        averageOrderValue: Number(summary.averageOrderValue || 0),
        averageItems: Number(summary.averageItems || 0),
        completionRate: Number(summary.billableOrderCount) > 0 ? (Number(summary.completedOrderCount) / Number(summary.billableOrderCount)) * 100 : 0,
        todayRevenue: Number(summary.todayRevenue || 0),
        yesterdayRevenue: Number(summary.yesterdayRevenue || 0),
        revenueDelta: previousFilter && previousRevenue > 0
          ? ((revenue - previousRevenue) / previousRevenue) * 100
          : null,
        totalStays: Number(stays.total || 0),
        returningStays: Number(stays.returning || 0),
        newStays: Number(stays.new || 0),
        repeatStayRate: Number(stays.total) > 0 ? (Number(stays.returning) / Number(stays.total)) * 100 : 0,
      },
      trend: trendRes.rows.map((row: any) => ({
        label: row.label,
        revenue: Number(row.revenue || 0),
        orders: Number(row.orders || 0),
      })),
      statusMix: statusRes.rows.map((row: any) => ({ status: row.status, count: Number(row.count) })),
      hourlyDemand: hoursRes.rows.map((row: any) => ({ hour: Number(row.hour), count: Number(row.orders) })),
      peakHour: hoursRes.rows.length
        ? `${String(hoursRes.rows.reduce((best: any, row: any) => Number(row.orders) > Number(best.orders) ? row : best).hour).padStart(2, "0")}:00`
        : "No orders yet",
      topRooms: roomsRes.rows.map((row: any) => ({ room: row.room, orders: Number(row.orders), revenue: Number(row.revenue || 0) })),
      categories: categoriesRes.rows.map((row: any) => ({ name: row.name, orders: Number(row.orders), revenue: Number(row.revenue || 0) })),
      topItems: itemsRes.rows.map((row: any) => ({ name: row.name, orders: Number(row.orders), quantity: Number(row.quantity), revenue: Number(row.revenue || 0) })),
      highValueOrders: highOrdersRes.rows.map((row: any) => ({ ...row, total: Number(row.total || 0) })),
    });
  } catch (err) {
    console.error("[Analytics] Report error:", err);
    res.status(500).json({ error: "Failed to load analytics report" });
  }
});

export default router;
