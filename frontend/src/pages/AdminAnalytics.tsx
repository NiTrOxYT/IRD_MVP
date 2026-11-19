import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  BedDouble,
  CheckCircle2,
  Clock3,
  Download,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { AnalyticsRange, AnalyticsReport, getAnalytics } from "../lib/api";
import { formatINR } from "../lib/currency";
import { joinAdminRoom, onOrderCreated, onOrderStatusChanged } from "../lib/socket";
import { cn } from "../lib/utils";

const ranges: Array<{ key: AnalyticsRange; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "thisMonth", label: "This month" },
  { key: "prevMonth", label: "Last month" },
  { key: "all", label: "All time" },
];

const statusColors: Record<string, string> = {
  pending: "#C98A28",
  accepted: "#6883A4",
  preparing: "#99714C",
  ready: "#438B73",
  out_for_delivery: "#567B77",
  delivered: "#56866C",
  cancelled: "#B55E50",
  rejected: "#9D4C48",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Declined",
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-[#E5DDD1] bg-[#FFFDF9] p-4 shadow-[0_3px_14px_rgba(41,35,31,0.035)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#ECD7A9] bg-[#FAF3E6] text-[#8E6314]">{icon}</span>
        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#B88223]/60" />
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#766B61]">{label}</p>
      <p className="mt-1 font-serif text-[22px] font-bold leading-tight tracking-tight text-[#29231F] sm:text-2xl">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#766B61]">{detail}</p>
    </article>
  );
}

function Panel({ title, subtitle, children, className }: { title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-[#E5DDD1] bg-[#FFFDF9] p-4 shadow-[0_3px_14px_rgba(41,35,31,0.035)] sm:p-5", className)}>
      <div className="mb-4">
        <h3 className="font-serif text-lg font-bold text-[#29231F] sm:text-xl">{title}</h3>
        <p className="mt-0.5 text-[11px] text-[#766B61]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function RankList({ rows, kind }: { rows: Array<{ name: string; revenue: number; orders: number; quantity?: number }>; kind: "sales" | "quantity" }) {
  const max = Math.max(...rows.map((row) => kind === "sales" ? row.revenue : row.quantity || 0), 1);
  if (!rows.length) return <p className="py-6 text-center text-xs text-[#8A7E73]">No order data in this range.</p>;
  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const raw = kind === "sales" ? row.revenue : row.quantity || 0;
        return (
          <div key={row.name} className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#F5EFE5] font-mono text-[10px] font-bold text-[#8E6314]">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-semibold text-[#3E352E]">{row.name}</span>
                <span className="shrink-0 text-xs font-bold text-[#29231F]">{kind === "sales" ? formatINR(row.revenue) : `${row.quantity || 0} sold`}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0EAE1]">
                <div className="h-full rounded-full bg-[#8A563B]" style={{ width: `${Math.max(4, (raw / max) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-[#8A7E73]">{kind === "sales" ? `${row.quantity || 0} portions · ${row.orders} orders` : `${row.orders} orders · ${formatINR(row.revenue)}`}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RevenueChart({ rows, metric, onMetricChange }: { rows: AnalyticsReport["trend"]; metric: "revenue" | "orders"; onMetricChange: (metric: "revenue" | "orders") => void }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  if (!rows.length) return <div className="grid h-44 place-items-center text-xs text-[#8A7E73]">No revenue recorded in this range.</div>;
  const max = Math.max(...rows.map((row) => row[metric]), 1);
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? 500 : 18 + (index / (rows.length - 1)) * 964;
    const y = 142 - (row[metric] / max) * 116;
    return { x, y };
  });
  const curvePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x},${point.y}`;
    const previous = points[index - 1];
    const beforePrevious = points[index - 2] || previous;
    const next = points[index + 1] || point;
    const controlOne = { x: previous.x + (point.x - beforePrevious.x) / 6, y: previous.y + (point.y - beforePrevious.y) / 6 };
    const controlTwo = { x: point.x - (next.x - previous.x) / 6, y: point.y - (next.y - previous.y) / 6 };
    return `${path} C ${controlOne.x},${controlOne.y} ${controlTwo.x},${controlTwo.y} ${point.x},${point.y}`;
  }, "");
  const labels = [rows[0], rows[Math.floor((rows.length - 1) / 2)], rows[rows.length - 1]];
  const total = rows.reduce((sum, row) => sum + row[metric], 0);
  const selected = rows[Math.min(selectedIndex ?? rows.length - 1, rows.length - 1)];
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-2xl font-bold text-[#29231F]">{metric === "revenue" ? formatINR(total) : total.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-[#766B61]">{metric === "revenue" ? "Billable order value in this range" : "Orders placed in this range"}</p>
        </div>
        <div className="flex rounded-lg border border-[#E5DDD1] bg-[#FAF8F5] p-0.5" aria-label="Trend metric">
          {(["revenue", "orders"] as const).map((value) => <button key={value} onClick={() => onMetricChange(value)} aria-pressed={metric === value} className={cn("rounded-md px-2.5 py-1.5 text-[10px] font-semibold capitalize", metric === value ? "bg-white text-[#75462F] shadow-sm" : "text-[#766B61] hover:text-[#29231F]")}>{value}</button>)}
        </div>
      </div>
      <svg viewBox="0 0 1000 165" preserveAspectRatio="none" className="mt-3 h-40 w-full" role="img" aria-label={`In-room dining ${metric} trend`}>
        <defs><linearGradient id="irdRevenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#B88223" stopOpacity="0.25" /><stop offset="100%" stopColor="#B88223" stopOpacity="0.015" /></linearGradient></defs>
        {[26, 64, 102, 142].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#EDE6DC" strokeDasharray="4 8" />)}
        {points.length > 0 && <path d={`${curvePath} L ${points[points.length - 1].x},150 L ${points[0].x},150 Z`} fill="url(#irdRevenueFill)" />}
        {points.length > 0 && <path d={curvePath} fill="none" stroke="#8A563B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {points.map((point, index) => <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r={selectedIndex === index ? "7" : "5"} fill={selectedIndex === index ? "#8A563B" : "#FFFDF9"} stroke="#8A563B" strokeWidth="2" vectorEffect="non-scaling-stroke" role="button" tabIndex={0} aria-label={`${rows[index].label}: ${formatINR(rows[index].revenue)}, ${rows[index].orders} orders`} className="cursor-pointer outline-none focus-visible:stroke-[#B88223]" onClick={() => setSelectedIndex(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedIndex(index); } }}><title>{`${rows[index].label}: ${formatINR(rows[index].revenue)} · ${rows[index].orders} orders`}</title></circle>)}
      </svg>
      <div className="flex justify-between text-[10px] text-[#8A7E73]">{labels.map((row, index) => <span key={`${row.label}-${index}`}>{row.label}</span>)}</div>
      <div aria-live="polite" className="mt-3 flex items-center justify-between rounded-xl bg-[#FAF5ED] px-3 py-2 text-[11px]"><span className="font-semibold text-[#51473F]">{selected.label}</span><span className="text-[#766B61]">{selected.orders} orders</span><strong className="text-[#75462F]">{formatINR(selected.revenue)}</strong></div>
    </div>
  );
}

export function AdminAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [trendMetric, setTrendMetric] = useState<"revenue" | "orders">("revenue");
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const loadReport = useCallback(async (selectedRange: AnalyticsRange, quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setReport(await getAnalytics(selectedRange));
    } catch (err: any) {
      setError(err?.message || "Could not load analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadReport(range); }, [range, loadReport]);

  useEffect(() => {
    joinAdminRoom();
    const refresh = () => void loadReport(range, true);
    const removeCreated = onOrderCreated(refresh);
    const removeStatus = onOrderStatusChanged(refresh);
    return () => { removeCreated(); removeStatus(); };
  }, [range, loadReport]);

  const maxHour = useMemo(() => Math.max(...(report?.hourlyDemand.map((row) => row.count) || [0]), 1), [report]);

  const exportReport = () => {
    if (!report) return;
    const rows: Array<Array<string | number>> = [
      ["Section", "Name", "Orders", "Quantity", "Revenue", "Status", "Room", "Guest", "Placed"],
      ["Summary", "Order revenue", report.summary.orderCount, "", report.summary.revenue, "", "", "", ""],
      ["Summary", "Average order value", "", "", report.summary.averageOrderValue, "", "", "", ""],
      ...report.trend.map((row) => ["Trend", row.label, row.orders, "", row.revenue, "", "", "", ""]),
      ...report.topItems.map((row) => ["Menu item", row.name, row.orders, row.quantity, row.revenue, "", "", "", ""]),
      ...report.topRooms.map((row) => ["Room", row.room, row.orders, "", row.revenue, "", row.room, "", ""]),
      ...report.highValueOrders.map((row) => ["Order", row.orderNumber, "", "", row.total, row.status, row.room, row.guestName, row.createdAt]),
    ];
    const csv = rows.map((row) => row.map((value) => {
      const safeValue = /^[=+\-@]/.test(String(value)) ? `'${value}` : value;
      return `"${String(safeValue).replaceAll('"', '""')}"`;
    }).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ird-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading && !report) return <div className="grid min-h-72 place-items-center text-[#8A563B]"><LoaderCircle className="h-8 w-8 animate-spin" /><span className="sr-only">Loading analytics</span></div>;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E6314]">IN-ROOM DINING · PERFORMANCE</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#29231F] sm:text-4xl">Analytics</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#766B61]">Revenue, room demand, guest stays, and menu performance from your order history.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] p-1 no-scrollbar">
            {ranges.map(({ key, label }) => <button key={key} onClick={() => setRange(key)} className={cn("shrink-0 rounded-lg px-3 py-2 text-[10px] font-semibold transition-colors", range === key ? "border border-[#ECD7A9] bg-[#FAF3E6] text-[#8E6314] shadow-2xs" : "text-[#766B61] hover:bg-[#F5EFE5]")}>{label}</button>)}
          </div>
          <div className="flex gap-2">
            <button onClick={exportReport} disabled={!report} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] px-3 text-xs font-semibold text-[#51473F] hover:bg-[#F5EFE5] disabled:opacity-50"><Download className="h-3.5 w-3.5 text-[#8E6314]" />Export CSV</button>
            <button onClick={() => void loadReport(range, true)} disabled={refreshing} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5DDD1] bg-[#FFFDF9] px-3 text-xs font-semibold text-[#51473F] hover:bg-[#F5EFE5] disabled:opacity-60"><RefreshCw className={cn("h-3.5 w-3.5 text-[#8E6314]", refreshing && "animate-spin")} />Refresh</button>
          </div>
        </div>
      </div>

      {error && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button onClick={() => void loadReport(range)} className="font-bold underline">Try again</button></div>}

      {!report || report.summary.orderCount === 0 ? (
        <section className="rounded-3xl border border-dashed border-[#DCCDBA] bg-[#FFFDF9] px-5 py-14 text-center">
          <Activity className="mx-auto h-8 w-8 text-[#B88223]" />
          <h2 className="mt-3 font-serif text-xl font-bold text-[#29231F]">No orders in this date range</h2>
          <p className="mt-1 text-xs text-[#766B61]">Analytics will fill in as in-room dining orders come in.</p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
            <MetricCard icon={<BadgeIndianRupee className="h-5 w-5" />} label="Order revenue" value={formatINR(report.summary.revenue)} detail={`${formatINR(report.summary.todayRevenue)} today`} />
            <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Orders" value={String(report.summary.orderCount)} detail={`${report.summary.activeOrderCount} currently active`} />
            <MetricCard icon={<ArrowUpRight className="h-5 w-5" />} label="Average order" value={formatINR(report.summary.averageOrderValue)} detail={`${report.summary.averageItems.toFixed(1)} items per order`} />
            <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Delivery rate" value={`${Math.round(report.summary.completionRate)}%`} detail={`${report.summary.completedOrderCount} delivered orders`} />
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
            <MetricCard icon={<BedDouble className="h-5 w-5" />} label="Stays with orders" value={String(report.summary.totalStays)} detail={`${report.summary.newStays} stays with one billable order`} />
            <MetricCard icon={<Users className="h-5 w-5" />} label="Repeat-order stays" value={`${report.summary.repeatStayRate.toFixed(1)}%`} detail={`${report.summary.returningStays} stays placed multiple billable orders`} />
            <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Active order value" value={formatINR(report.summary.activeValue)} detail={`${report.summary.activeOrderCount} orders in progress`} />
            <MetricCard icon={<XCircle className="h-5 w-5" />} label="Cancelled / declined" value={formatINR(report.summary.cancelledValue)} detail={`${report.summary.cancelledOrderCount} orders`} />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Panel title="Revenue & order trend" subtitle={range === "today" || range === "yesterday" ? "Hourly performance · select a metric to explore" : range === "all" ? "Weekly performance · all recorded history" : "Daily performance · select a metric to explore"}>
              <div className="mb-4 flex items-center gap-2 text-[10px] text-[#766B61]"><span className="h-2 w-2 rounded-full bg-[#8A563B]" />Billable orders {range !== "all" && <span className="ml-auto inline-flex items-center gap-1 font-semibold">{report.summary.revenueDelta === null ? <span>No previous-period revenue</span> : <><span className={report.summary.revenueDelta >= 0 ? "text-emerald-700" : "text-rose-700"}>{report.summary.revenueDelta >= 0 ? <ArrowUpRight className="inline h-3 w-3" /> : <ArrowDownRight className="inline h-3 w-3" />}{Math.abs(report.summary.revenueDelta).toFixed(0)}%</span><span>vs previous period</span></>}</span>}</div>
              <RevenueChart rows={report.trend} metric={trendMetric} onMetricChange={setTrendMetric} />
            </Panel>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <Insight icon={<TrendingUp className="h-4 w-4" />} label="Top ordered dish" value={report.topItems[0]?.name || "No orders yet"} detail={report.topItems[0] ? `${report.topItems[0].quantity} sold · ${formatINR(report.topItems[0].revenue)}` : "Waiting for guest orders"} />
              <Insight icon={<Clock3 className="h-4 w-4" />} label="Peak service hour" value={report.peakHour} detail="Busiest order hour in this range" />
              <Insight icon={<BedDouble className="h-4 w-4" />} label="Busiest suite" value={report.topRooms[0] ? `Suite ${report.topRooms[0].room}` : "No room activity"} detail={report.topRooms[0] ? `${report.topRooms[0].orders} orders · ${formatINR(report.topRooms[0].revenue)}` : "Waiting for room orders"} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="Order status" subtitle="Current service pipeline.">
              <div className="space-y-3">
                {report.statusMix.map((row) => <div key={row.status}><div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]"><span className="flex items-center gap-2 text-[#51473F]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[row.status] || "#93877D" }} />{statusLabels[row.status] || row.status}</span><strong className="text-[#29231F]">{row.count}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[#F0EAE1]"><div className="h-full rounded-full" style={{ width: `${(row.count / report.summary.orderCount) * 100}%`, backgroundColor: statusColors[row.status] || "#93877D" }} /></div></div>)}
              </div>
            </Panel>
            <Panel title="Demand by hour" subtitle="When guests place orders.">
              <div className="flex h-40 items-end gap-1 border-b border-[#E5DDD1] pb-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = report.hourlyDemand.find((entry) => entry.hour === hour)?.count || 0;
                  return <button key={hour} type="button" onClick={() => setSelectedHour(hour)} aria-label={`${String(hour).padStart(2, "0")}:00, ${count} orders`} aria-pressed={selectedHour === hour} className="group relative flex h-full min-w-0 flex-1 items-end outline-none"><span className={cn("w-full rounded-t-sm transition-colors group-hover:bg-[#B88223] group-focus-visible:bg-[#B88223]", selectedHour === hour ? "bg-[#B88223]" : "bg-[#8A563B]/80")} style={{ height: `${count ? Math.max(5, (count / maxHour) * 100) : 2}%` }} /><span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#29231F] px-2 py-1 text-[9px] text-white group-hover:block group-focus-visible:block">{String(hour).padStart(2, "0")}:00 · {count}</span></button>;
                })}
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-[#8A7E73]"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
              <p aria-live="polite" className="mt-3 rounded-lg bg-[#FAF5ED] px-3 py-2 text-[10px] text-[#766B61]">{selectedHour === null ? `Peak: ${report.peakHour} · ${report.hourlyDemand.find((row) => `${String(row.hour).padStart(2, "0")}:00` === report.peakHour)?.count || 0} orders` : `${String(selectedHour).padStart(2, "0")}:00–${String((selectedHour + 1) % 24).padStart(2, "0")}:00 · ${report.hourlyDemand.find((row) => row.hour === selectedHour)?.count || 0} orders`}</p>
            </Panel>
            <Panel title="Top suites" subtitle="Room-level order concentration.">
              <RankList rows={report.topRooms.map((row) => ({ name: `Suite ${row.room}`, revenue: row.revenue, orders: row.orders }))} kind="sales" />
            </Panel>
            <Panel title="Category share" subtitle="Item sales before tax and service charge.">
              <RankList rows={report.categories} kind="sales" />
            </Panel>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Menu winners by item sales" subtitle="Item subtotal before tax and service charge."><RankList rows={report.topItems} kind="sales" /></Panel>
            <Panel title="Most ordered dishes" subtitle="Guest favourites by quantity."><RankList rows={report.topItems} kind="quantity" /></Panel>
          </section>

          <Panel title="High-value orders" subtitle="Largest order totals in the selected range.">
            {report.highValueOrders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr className="border-b border-[#E5DDD1] text-[9px] uppercase tracking-[0.14em] text-[#8A7E73]"><th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Suite / Guest</th><th className="py-3 pr-3">Placed</th><th className="py-3 pr-3">Status</th><th className="py-3 text-right">Total</th></tr></thead><tbody>{report.highValueOrders.map((order) => <tr key={order.id} className="border-b border-[#E5DDD1]/70 last:border-0"><td className="py-3 pr-3 font-mono font-semibold text-[#8E6314]">{order.orderNumber}</td><td className="py-3 pr-3"><span className="font-semibold text-[#3E352E]">Suite {order.room}</span><span className="ml-2 text-[#8A7E73]">{order.guestName}</span></td><td className="py-3 pr-3 text-[#766B61]">{new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td><td className="py-3 pr-3"><span className="rounded-full border px-2 py-1 text-[10px] font-semibold" style={{ color: statusColors[order.status] || "#766B61", borderColor: `${statusColors[order.status] || "#766B61"}55`, backgroundColor: `${statusColors[order.status] || "#766B61"}10` }}>{statusLabels[order.status] || order.status}</span></td><td className="py-3 text-right font-sans font-extrabold text-[#29231F]">{formatINR(order.total)}</td></tr>)}</tbody></table></div> : <p className="py-5 text-center text-xs text-[#8A7E73]">No orders in this date range.</p>}
          </Panel>
        </>
      )}
    </main>
  );
}

function Insight({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#E5DDD1] bg-[#FFFDF9] p-4 shadow-[0_3px_14px_rgba(41,35,31,0.035)]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FAF3E6] text-[#8E6314]">{icon}</span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8A7E73]">{label}</p><p className="mt-1 truncate font-serif text-base font-bold text-[#29231F]">{value}</p><p className="mt-0.5 truncate text-[10px] text-[#766B61]">{detail}</p></div></article>;
}

export default AdminAnalytics;
