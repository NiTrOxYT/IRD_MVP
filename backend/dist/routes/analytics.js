import { Router } from "express";
import { query } from "../db/index.js";
import { requireStaff } from "../middleware/auth.js";
const router = Router();
const currentRangeSql = {
    today: "created_at >= CURRENT_DATE",
    yesterday: "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
    "7d": "created_at >= CURRENT_DATE - INTERVAL '6 days'",
    "30d": "created_at >= CURRENT_DATE - INTERVAL '29 days'",
    thisMonth: "created_at >= DATE_TRUNC('month', CURRENT_DATE)",
    prevMonth: "created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', CURRENT_DATE)",
    all: "TRUE",
};
const previousRangeSql = {
    today: "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
    yesterday: "created_at >= CURRENT_DATE - INTERVAL '2 days' AND created_at < CURRENT_DATE - INTERVAL '1 day'",
    "7d": "created_at >= CURRENT_DATE - INTERVAL '13 days' AND created_at < CURRENT_DATE - INTERVAL '6 days'",
    "30d": "created_at >= CURRENT_DATE - INTERVAL '59 days' AND created_at < CURRENT_DATE - INTERVAL '29 days'",
    thisMonth: "created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', CURRENT_DATE)",
    prevMonth: "created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months' AND created_at < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'",
};
const billableStatusSql = "status NOT IN ('cancelled', 'rejected')";
router.get("/", requireStaff("analytics:view"), async (req, res) => {
    const range = typeof req.query.range === "string" && currentRangeSql[req.query.range]
        ? req.query.range
        : "7d";
    const propertyId = req.staff.propertyId;
    const currentFilter = currentRangeSql[range];
    const previousFilter = previousRangeSql[range];
    try {
        const [summaryRes, staysRes, trendRes, statusRes, hoursRes, roomsRes, categoriesRes, itemsRes, highOrdersRes, comparisonRes] = await Promise.all([
            query(`SELECT
           COUNT(*)::int AS "orderCount",
           COUNT(*) FILTER (WHERE status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'))::int AS "activeOrderCount",
           COUNT(*) FILTER (WHERE status = 'delivered')::int AS "completedOrderCount",
           COUNT(*) FILTER (WHERE status IN ('cancelled', 'rejected'))::int AS "cancelledOrderCount",
           COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue,
           COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery')), 0) AS "activeValue",
           COALESCE(SUM(total_amount) FILTER (WHERE status IN ('cancelled', 'rejected')), 0) AS "cancelledValue",
           COALESCE(AVG(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS "averageOrderValue",
           COALESCE((SELECT AVG(item_count) FROM (
             SELECT SUM(oi.quantity)::numeric AS item_count
             FROM orders so JOIN order_items oi ON oi.order_id = so.id
             WHERE so.property_id = $1 AND ${currentFilter}
             GROUP BY so.id
           ) item_counts), 0) AS "averageItems",
           COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
           COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE AND ${billableStatusSql}), 0) AS "todayRevenue",
           COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE AND ${billableStatusSql}), 0) AS "yesterdayRevenue"
         FROM orders
         WHERE property_id = $1 AND ${currentFilter}`, [propertyId]),
            query(`SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE order_count > 1)::int AS returning,
                COUNT(*) FILTER (WHERE order_count = 1)::int AS new
         FROM (
           SELECT stay_id, COUNT(*) AS order_count
           FROM orders
           WHERE property_id = $1 AND ${currentFilter}
           GROUP BY stay_id
         ) stay_orders`, [propertyId]),
            query(`SELECT ${range === "today" || range === "yesterday" ? "DATE_TRUNC('hour', created_at)" : range === "all" ? "DATE_TRUNC('week', created_at)::date" : "created_at::date"} AS bucket,
                COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue,
                COUNT(*)::int AS orders
         FROM orders
         WHERE property_id = $1 AND ${currentFilter}
         GROUP BY bucket ORDER BY bucket DESC LIMIT 90`, [propertyId]),
            query(`SELECT status, COUNT(*)::int AS count
         FROM orders WHERE property_id = $1 AND ${currentFilter}
         GROUP BY status ORDER BY count DESC`, [propertyId]),
            query(`SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS orders
         FROM orders WHERE property_id = $1 AND ${currentFilter}
         GROUP BY hour ORDER BY hour`, [propertyId]),
            query(`SELECT room_number AS room,
                COUNT(*)::int AS orders,
                COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue
         FROM orders WHERE property_id = $1 AND ${currentFilter}
         GROUP BY room_number ORDER BY revenue DESC LIMIT 5`, [propertyId]),
            query(`SELECT COALESCE(c.name, 'Other') AS name,
                COUNT(DISTINCT oi.order_id)::int AS orders,
                COALESCE(SUM(oi.line_total) FILTER (WHERE ${billableStatusSql.replaceAll("status", "o.status")}), 0) AS revenue
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
         LEFT JOIN menu_categories c ON c.id = mi.category_id
         WHERE o.property_id = $1 AND ${currentFilter.replaceAll("created_at", "o.created_at")}
         GROUP BY c.name ORDER BY revenue DESC LIMIT 8`, [propertyId]),
            query(`SELECT oi.item_name AS name,
                SUM(oi.quantity)::int AS quantity,
                COUNT(DISTINCT oi.order_id)::int AS orders,
                COALESCE(SUM(oi.line_total) FILTER (WHERE ${billableStatusSql.replaceAll("status", "o.status")}), 0) AS revenue
         FROM orders o JOIN order_items oi ON oi.order_id = o.id
         WHERE o.property_id = $1 AND ${currentFilter.replaceAll("created_at", "o.created_at")}
         GROUP BY oi.item_name ORDER BY revenue DESC LIMIT 8`, [propertyId]),
            query(`SELECT id, order_number AS "orderNumber", room_number AS room,
                guest_name AS "guestName", status, total_amount AS total,
                created_at AS "createdAt"
         FROM orders WHERE property_id = $1 AND ${currentFilter}
         ORDER BY total_amount DESC LIMIT 5`, [propertyId]),
            previousFilter
                ? query(`SELECT COALESCE(SUM(total_amount) FILTER (WHERE ${billableStatusSql}), 0) AS revenue
             FROM orders WHERE property_id = $1 AND ${previousFilter}`, [propertyId])
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
                activeOrderCount: Number(summary.activeOrderCount || 0),
                completedOrderCount: Number(summary.completedOrderCount || 0),
                cancelledOrderCount: Number(summary.cancelledOrderCount || 0),
                revenue,
                activeValue: Number(summary.activeValue || 0),
                cancelledValue: Number(summary.cancelledValue || 0),
                averageOrderValue: Number(summary.averageOrderValue || 0),
                averageItems: Number(summary.averageItems || 0),
                completionRate: Number(summary.orderCount) > 0 ? (Number(summary.completedOrderCount) / Number(summary.orderCount)) * 100 : 0,
                todayRevenue: Number(summary.todayRevenue || 0),
                yesterdayRevenue: Number(summary.yesterdayRevenue || 0),
                revenueDelta: previousFilter
                    ? previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : revenue > 0 ? 100 : 0
                    : 0,
                totalStays: Number(stays.total || 0),
                returningStays: Number(stays.returning || 0),
                newStays: Number(stays.new || 0),
                repeatStayRate: Number(stays.total) > 0 ? (Number(stays.returning) / Number(stays.total)) * 100 : 0,
            },
            trend: trendRes.rows.reverse().map((row) => ({
                label: range === "today" || range === "yesterday"
                    ? new Date(row.bucket).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
                    : new Date(row.bucket).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                revenue: Number(row.revenue || 0),
                orders: Number(row.orders || 0),
            })),
            statusMix: statusRes.rows.map((row) => ({ status: row.status, count: Number(row.count) })),
            hourlyDemand: hoursRes.rows.map((row) => ({ hour: Number(row.hour), count: Number(row.orders) })),
            peakHour: hoursRes.rows.length
                ? `${String(hoursRes.rows.reduce((best, row) => Number(row.orders) > Number(best.orders) ? row : best).hour).padStart(2, "0")}:00`
                : "No orders yet",
            topRooms: roomsRes.rows.map((row) => ({ room: row.room, orders: Number(row.orders), revenue: Number(row.revenue || 0) })),
            categories: categoriesRes.rows.map((row) => ({ name: row.name, orders: Number(row.orders), revenue: Number(row.revenue || 0) })),
            topItems: itemsRes.rows.map((row) => ({ name: row.name, orders: Number(row.orders), quantity: Number(row.quantity), revenue: Number(row.revenue || 0) })),
            highValueOrders: highOrdersRes.rows.map((row) => ({ ...row, total: Number(row.total || 0) })),
        });
    }
    catch (err) {
        console.error("[Analytics] Report error:", err);
        res.status(500).json({ error: "Failed to load analytics report" });
    }
});
export default router;
