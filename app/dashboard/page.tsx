"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
  Store,
  Package,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Product = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type MonthlyTarget = {
  product_id: string;
  month: string;
  outlet_target: number | null;
  value_target: number | null;
};

type DailyValue = {
  product_id: string;
  entry_date: string;
  value: number | null;
};

type OutletTransaction = {
  outlet_id: string;
  product_id: string;
  transaction_date: string;
};

type ProductSummary = {
  id: string;
  code: string;
  name: string;
  targetValue: number;
  actualValue: number;
  gapValue: number;
  valuePercent: number;
  targetOutlet: number;
  actualOutlet: number;
  gapOutlet: number;
  outletPercent: number;
};

type DailyChartData = {
  day: string;
  actual: number;
  target: number;
};

const PRODUCT_ORDER = [
  "POCARI_ALL",
  "ION_ALL",
  "SOYJOY",
  "FIBE",
  "ORONAMIN",
];

const PRODUCT_COLORS = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#ea580c",
  "#16a34a",
];

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const numberFormat = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

const percent = (actual: number, target: number) =>
  target > 0 ? Math.round((actual / target) * 100) : 0;

const monthLabel = (value: string) =>
  new Date(`${value}-02T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });

const getMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ElementType;
  tone: "blue" | "green" | "orange" | "purple";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    purple: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            {title}
          </p>
          <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ring-1 ${tones[tone]}`}>
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

function ProgressBar({
  value,
  color = "bg-blue-600",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
      <Activity className="text-slate-300" size={28} />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [selectedMonth, setSelectedMonth] = useState(getMonthValue);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [dailyChart, setDailyChart] = useState<DailyChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          throw new Error(
            "Sesi login tidak ditemukan. Silakan login kembali."
          );
        }

        const [year, month] = selectedMonth.split("-").map(Number);
        const monthStart = `${selectedMonth}-01`;
        const nextMonthDate = new Date(year, month, 1);
        const nextMonth = dateKey(nextMonthDate);
        const daysInMonth = new Date(year, month, 0).getDate();

        const [
          productResponse,
          targetResponse,
          valueResponse,
          transactionResponse,
        ] = await Promise.all([
          supabase
            .from("products")
            .select("id, code, name, active")
            .eq("active", true),

          supabase
            .from("monthly_targets")
            .select("product_id, month, outlet_target, value_target")
            .eq("user_id", user.id)
            .eq("month", monthStart),

          supabase
            .from("daily_product_values")
            .select("product_id, entry_date, value")
            .eq("user_id", user.id)
            .gte("entry_date", monthStart)
            .lt("entry_date", nextMonth),

          supabase
            .from("daily_outlet_transactions")
            .select("outlet_id, product_id, transaction_date")
            .eq("user_id", user.id)
            .gte("transaction_date", monthStart)
            .lt("transaction_date", nextMonth),
        ]);

        const queryErrors = [
          productResponse.error,
          targetResponse.error,
          valueResponse.error,
          transactionResponse.error,
        ].filter(Boolean);

        if (queryErrors.length > 0) {
          throw new Error(
            queryErrors[0]?.message || "Gagal mengambil data dashboard."
          );
        }

        const productData = (productResponse.data || []) as Product[];
        const targetData = (targetResponse.data || []) as MonthlyTarget[];
        const valueData = (valueResponse.data || []) as DailyValue[];
        const transactionData = (transactionResponse.data ||
          []) as OutletTransaction[];

        const allowedProducts = productData
          .filter((product) => PRODUCT_ORDER.includes(product.code))
          .sort(
            (a, b) =>
              PRODUCT_ORDER.indexOf(a.code) -
              PRODUCT_ORDER.indexOf(b.code)
          );

        const targetByProduct = new Map<string, MonthlyTarget>();

        targetData.forEach((target) => {
          targetByProduct.set(target.product_id, target);
        });

        const actualValueByProduct = new Map<string, number>();
        const actualOutletsByProduct = new Map<string, Set<string>>();
        const dailyActual = new Map<string, number>();

        valueData.forEach((entry) => {
          const value = Number(entry.value || 0);

          actualValueByProduct.set(
            entry.product_id,
            (actualValueByProduct.get(entry.product_id) || 0) + value
          );

          dailyActual.set(
            entry.entry_date,
            (dailyActual.get(entry.entry_date) || 0) + value
          );
        });

        transactionData.forEach((entry) => {
          if (!actualOutletsByProduct.has(entry.product_id)) {
            actualOutletsByProduct.set(entry.product_id, new Set());
          }

          actualOutletsByProduct.get(entry.product_id)!.add(entry.outlet_id);
        });

        const summary: ProductSummary[] = allowedProducts.map((product) => {
          const target = targetByProduct.get(product.id);

          const targetValue = Number(target?.value_target || 0);
          const actualValue = Number(
            actualValueByProduct.get(product.id) || 0
          );
          const targetOutlet = Number(target?.outlet_target || 0);
          const actualOutlet =
            actualOutletsByProduct.get(product.id)?.size || 0;

          return {
            id: product.id,
            code: product.code,
            name: product.name,
            targetValue,
            actualValue,
            gapValue: Math.max(0, targetValue - actualValue),
            valuePercent: percent(actualValue, targetValue),
            targetOutlet,
            actualOutlet,
            gapOutlet: Math.max(0, targetOutlet - actualOutlet),
            outletPercent: percent(actualOutlet, targetOutlet),
          };
        });

        const chartData: DailyChartData[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;

          chartData.push({
            day: String(day),
            actual: dailyActual.get(date) || 0,
            target: summary.reduce((sum, product) => {
              return sum + product.targetValue;
            }, 0) / daysInMonth,
          });
        }

        setProducts(summary);
        setDailyChart(chartData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase, selectedMonth]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totals = useMemo(() => {
    const targetValue = products.reduce((sum, item) => sum + item.targetValue, 0);
    const actualValue = products.reduce((sum, item) => sum + item.actualValue, 0);
    const targetOutlet = products.reduce((sum, item) => sum + item.targetOutlet, 0);
    const actualOutlet = products.reduce((sum, item) => sum + item.actualOutlet, 0);

    return {
      targetValue,
      actualValue,
      gapValue: Math.max(0, targetValue - actualValue),
      valuePercent: percent(actualValue, targetValue),
      targetOutlet,
      actualOutlet,
      gapOutlet: Math.max(0, targetOutlet - actualOutlet),
      outletPercent: percent(actualOutlet, targetOutlet),
    };
  }, [products]);

  const valuePie = useMemo(
    () => [
      { name: "Aktual", value: Math.min(totals.actualValue, totals.targetValue) },
      {
        name: "Sisa target",
        value: Math.max(0, totals.targetValue - totals.actualValue),
      },
    ],
    [totals.actualValue, totals.targetValue]
  );

  const outletPie = useMemo(
    () => [
      {
        name: "Aktual",
        value: Math.min(totals.actualOutlet, totals.targetOutlet),
      },
      {
        name: "Sisa target",
        value: Math.max(0, totals.targetOutlet - totals.actualOutlet),
      },
    ],
    [totals.actualOutlet, totals.targetOutlet]
  );

  const productChart = useMemo(
    () =>
      products.map((product) => ({
        name:
          product.name.length > 17
            ? `${product.name.slice(0, 17)}…`
            : product.name,
        target: product.targetValue,
        actual: product.actualValue,
        outletTarget: product.targetOutlet,
        outletActual: product.actualOutlet,
      })),
    [products]
  );

  const uniqueOutletCount = useMemo(() => {
    // Jumlah outlet unik lintas semua produk.
    // Dihitung terpisah dari total outlet-produk pada tabel.
    return products.reduce((sum, item) => sum + item.actualOutlet, 0);
  }, [products]);

  const totalTransactionsLabel = numberFormat(uniqueOutletCount);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px] space-y-5">
            <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-80 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-7">
        <div className="mx-auto max-w-[1600px] space-y-5">
          {/* Header */}
          <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-600 p-3 text-white shadow-sm shadow-blue-200">
                <Activity size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Otsuka Sales Tracker
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Dashboard Performance
                </h1>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Pantau target, realisasi, dan gap setiap produk.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <CalendarDays size={16} className="text-slate-500" />
                <input
                  aria-label="Pilih bulan dashboard"
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="w-full min-w-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span>{refreshing ? "Memuat..." : "Refresh"}</span>
              </button>
            </div>
          </header>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Data dashboard gagal dimuat
                </p>
                <p className="mt-1 break-words text-sm">{error}</p>
                <button
                  onClick={() => void loadDashboard(true)}
                  className="mt-2 text-sm font-semibold underline underline-offset-4"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Target Value"
              value={currency(totals.targetValue)}
              note={`Target bulan ${monthLabel(selectedMonth)}`}
              icon={Target}
              tone="blue"
            />
            <MetricCard
              title="Actual Value"
              value={currency(totals.actualValue)}
              note={`${totals.valuePercent}% dari target value`}
              icon={Wallet}
              tone="green"
            />
            <MetricCard
              title="Gap Value"
              value={currency(totals.gapValue)}
              note={
                totals.gapValue === 0
                  ? "Target value sudah tercapai"
                  : "Kekurangan untuk mencapai target"
              }
              icon={ArrowDownRight}
              tone="orange"
            />
            <MetricCard
              title="Outlet Transaksi"
              value={totalTransactionsLabel}
              note={`${numberFormat(totals.actualOutlet)} outlet-produk tercatat`}
              icon={Store}
              tone="purple"
            />
          </div>

          {/* Progress */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel
              title="Pencapaian Value"
              subtitle="Realisasi dibandingkan target seluruh produk."
              action={
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-700">
                  {totals.valuePercent}%
                </span>
              }
            >
              <div className="mb-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <span className="text-slate-500">
                  Aktual:{" "}
                  <strong className="text-slate-800">
                    {currency(totals.actualValue)}
                  </strong>
                </span>
                <span className="text-right text-slate-500">
                  Target:{" "}
                  <strong className="text-slate-800">
                    {currency(totals.targetValue)}
                  </strong>
                </span>
              </div>
              <ProgressBar
                value={totals.valuePercent}
                color={
                  totals.valuePercent >= 100
                    ? "bg-emerald-500"
                    : "bg-blue-600"
                }
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  Gap: {currency(totals.gapValue)}
                </span>
                <span
                  className={
                    totals.valuePercent >= 100
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-blue-600"
                  }
                >
                  {totals.valuePercent >= 100
                    ? "Target tercapai"
                    : "Dalam proses"}
                </span>
              </div>
            </Panel>

            <Panel
              title="Pencapaian Outlet Transaksi"
              subtitle="Total target dan aktual outlet per produk."
              action={
                <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-sm font-bold text-violet-700">
                  {totals.outletPercent}%
                </span>
              }
            >
              <div className="mb-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <span className="text-slate-500">
                  Aktual:{" "}
                  <strong className="text-slate-800">
                    {numberFormat(totals.actualOutlet)}
                  </strong>
                </span>
                <span className="text-right text-slate-500">
                  Target:{" "}
                  <strong className="text-slate-800">
                    {numberFormat(totals.targetOutlet)}
                  </strong>
                </span>
              </div>
              <ProgressBar
                value={totals.outletPercent}
                color={
                  totals.outletPercent >= 100
                    ? "bg-emerald-500"
                    : "bg-violet-600"
                }
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  Gap: {numberFormat(totals.gapOutlet)} outlet-produk
                </span>
                <span
                  className={
                    totals.outletPercent >= 100
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-violet-600"
                  }
                >
                  {totals.outletPercent >= 100
                    ? "Target tercapai"
                    : "Dalam proses"}
                </span>
              </div>
            </Panel>
          </div>

          {/* Daily trend + donut */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Panel
              title="Tren Value Harian"
              subtitle="Nilai aktual harian seluruh produk dibandingkan target harian rata-rata."
              action={
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Aktual
                </span>
              }
            >
              {dailyChart.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dailyChart}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="actualGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2563eb"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#2563eb"
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tickFormatter={(value) => `${value}`}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={65}
                        tickFormatter={(value) =>
                          value >= 1_000_000
                            ? `${(value / 1_000_000).toFixed(0)} jt`
                            : value >= 1_000
                            ? `${(value / 1_000).toFixed(0)} rb`
                            : String(value)
                        }
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          currency(Number(value || 0)),
                          name === "actual"
                            ? "Aktual harian"
                            : "Target harian rata-rata",
                        ]}
                        labelFormatter={(label) => `Tanggal ${label}`}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="actual"
                        name="actual"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fill="url(#actualGradient)"
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        name="target"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Belum ada data grafik." />
              )}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Aktual harian
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />
                  Target harian rata-rata
                </span>
              </div>
            </Panel>

            <Panel
              title="Komposisi Pencapaian"
              subtitle="Perbandingan aktual dan sisa target."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">
                    Value
                  </p>
                  {totals.targetValue > 0 ? (
                    <div className="relative h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={valuePie}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={66}
                            paddingAngle={3}
                            stroke="none"
                          >
                            <Cell fill="#2563eb" />
                            <Cell fill="#e2e8f0" />
                          </Pie>
                          <Tooltip
                            formatter={(value) => currency(Number(value || 0))}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-slate-900">
                          {totals.valuePercent}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          tercapai
                        </span>
                      </div>
                    </div>
                  ) : (
                    <EmptyChart message="Target value belum diatur." />
                  )}
                  <div className="flex justify-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                      Aktual
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-200" />
                      Sisa target
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">
                    Outlet transaksi
                  </p>
                  {totals.targetOutlet > 0 ? (
                    <div className="relative h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={outletPie}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={66}
                            paddingAngle={3}
                            stroke="none"
                          >
                            <Cell fill="#7c3aed" />
                            <Cell fill="#e2e8f0" />
                          </Pie>
                          <Tooltip
                            formatter={(value) =>
                              `${numberFormat(Number(value || 0))} outlet-produk`
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-slate-900">
                          {totals.outletPercent}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          tercapai
                        </span>
                      </div>
                    </div>
                  ) : (
                    <EmptyChart message="Target outlet belum diatur." />
                  )}
                  <div className="flex justify-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-violet-600" />
                      Aktual
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-200" />
                      Sisa target
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Product charts */}
          <Panel
            title="Target vs Aktual per Produk"
            subtitle="Perbandingan value masing-masing produk pada bulan yang dipilih."
          >
            {productChart.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productChart}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    barGap={5}
                  >
                    <CartesianGrid
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <YAxis
                      width={65}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        value >= 1_000_000
                          ? `${(value / 1_000_000).toFixed(0)} jt`
                          : value >= 1_000
                          ? `${(value / 1_000).toFixed(0)} rb`
                          : String(value)
                      }
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        currency(Number(value || 0)),
                        name === "actual" ? "Aktual" : "Target",
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "actual" ? "Aktual" : "Target"
                      }
                    />
                    <Bar
                      dataKey="target"
                      name="target"
                      fill="#cbd5e1"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="actual"
                      name="actual"
                      fill="#2563eb"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="Belum ada produk untuk ditampilkan." />
            )}
          </Panel>

          {/* Per product progress */}
          <Panel
            title="Ringkasan Pencapaian Produk"
            subtitle="Progress dan kekurangan target untuk setiap produk."
          >
            {products.length === 0 ? (
              <EmptyChart message="Data produk belum tersedia." />
            ) : (
              <div className="space-y-4">
                {products.map((product, index) => (
                  <div
                    key={product.id}
                    className="grid grid-cols-1 gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0 md:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1.4fr)_minmax(150px,1fr)] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{
                          backgroundColor:
                            PRODUCT_COLORS[index % PRODUCT_COLORS.length],
                        }}
                      >
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {product.valuePercent >= 100
                            ? "Target value tercapai"
                            : `${product.valuePercent}% target value`}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500">
                          {currency(product.actualValue)}
                        </span>
                        <span className="font-medium text-slate-700">
                          {currency(product.targetValue)}
                        </span>
                      </div>
                      <ProgressBar
                        value={product.valuePercent}
                        color={
                          product.valuePercent >= 100
                            ? "bg-emerald-500"
                            : "bg-blue-600"
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-slate-500">Gap value</p>
                        <p
                          className={`mt-1 text-sm font-bold ${
                            product.gapValue === 0
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }`}
                        >
                          {product.gapValue === 0
                            ? "Tercapai"
                            : currency(product.gapValue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Outlet</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {numberFormat(product.actualOutlet)} /{" "}
                          {numberFormat(product.targetOutlet)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Detail tables */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel
              title="Detail Value Produk"
              subtitle="Aktual, target, gap rupiah, dan persentase."
            >
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[570px] text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-3 font-semibold">Produk</th>
                      <th className="px-2 py-3 text-right font-semibold">
                        Aktual
                      </th>
                      <th className="px-2 py-3 text-right font-semibold">
                        Target
                      </th>
                      <th className="px-2 py-3 text-right font-semibold">
                        Gap
                      </th>
                      <th className="px-2 py-3 text-right font-semibold">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-2 py-3 font-semibold text-slate-800">
                          {product.name}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-slate-600">
                          {currency(product.actualValue)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-slate-600">
                          {currency(product.targetValue)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-2 py-3 text-right font-semibold ${
                            product.gapValue === 0
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }`}
                        >
                          {product.gapValue === 0
                            ? `+${currency(
                                Math.max(
                                  0,
                                  product.actualValue - product.targetValue
                                )
                              )}`
                            : currency(product.gapValue)}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 font-bold ${
                              product.valuePercent >= 100
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {product.valuePercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td className="px-2 py-3">TOTAL</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        {currency(totals.actualValue)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        {currency(totals.targetValue)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-orange-600">
                        {currency(totals.gapValue)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {totals.valuePercent}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Panel>

            <Panel
              title="Detail Outlet Transaksi"
              subtitle="Aktual outlet unik per produk, target, dan gap."
            >
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-3 font-semibold">Produk</th>
                      <th className="px-2 py-3 text-right font-semibold">
                        Aktual
                      </th>
                      <th className="px-2 py-3 text-right font-semibold">
                        Target
                      </th>
                      <th className="px-2 py-3 text-right font-semibold">
                        Gap
                      </th>
                      <th className="px-2 py-3 text-right font-semibold">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-2 py-3 font-semibold text-slate-800">
                          {product.name}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-600">
                          {numberFormat(product.actualOutlet)}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-600">
                          {numberFormat(product.targetOutlet)}
                        </td>
                        <td
                          className={`px-2 py-3 text-right font-semibold ${
                            product.gapOutlet === 0
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }`}
                        >
                          {product.gapOutlet === 0
                            ? "0"
                            : numberFormat(product.gapOutlet)}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 font-bold ${
                              product.outletPercent >= 100
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-violet-50 text-violet-700"
                            }`}
                          >
                            {product.outletPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td className="px-2 py-3">TOTAL</td>
                      <td className="px-2 py-3 text-right">
                        {numberFormat(totals.actualOutlet)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {numberFormat(totals.targetOutlet)}
                      </td>
                      <td className="px-2 py-3 text-right text-orange-600">
                        {numberFormat(totals.gapOutlet)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {totals.outletPercent}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Panel>
          </div>

          {/* Product outlet chart */}
          <Panel
            title="Pencapaian Outlet per Produk"
            subtitle="Jumlah outlet aktual dibandingkan target setiap produk."
          >
            {productChart.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productChart}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    barGap={5}
                  >
                    <CartesianGrid
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={42}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        numberFormat(Number(value || 0)),
                        name === "outletActual" ? "Aktual" : "Target",
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "outletActual" ? "Aktual" : "Target"
                      }
                    />
                    <Bar
                      dataKey="outletTarget"
                      name="outletTarget"
                      fill="#cbd5e1"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="outletActual"
                      name="outletActual"
                      fill="#7c3aed"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="Belum ada data outlet untuk ditampilkan." />
            )}
          </Panel>

          {/* Footer */}
          <footer className="flex flex-col justify-between gap-2 px-1 pb-2 text-xs text-slate-400 sm:flex-row sm:items-center">
            <span>Otsuka Sales Tracker · Dashboard Performance</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={13} />
              {lastUpdated
                ? `Terakhir diperbarui ${lastUpdated.toLocaleTimeString(
                    "id-ID",
                    { hour: "2-digit", minute: "2-digit" }
                  )}`
                : "Menunggu data"}
            </span>
          </footer>
        </div>
      </main>
    </AppShell>
  );
}