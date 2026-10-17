
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import {
  History,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  Package,
  Store,
  RefreshCw,
  Search,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  FileClock,
  AlertCircle,
} from "lucide-react";

type Product = { id: string; name: string };
type ValueRow = {
  id: string;
  product_id: string;
  entry_date: string;
  value: number;
};
type TxRow = {
  id: string;
  product_id: string;
  outlet_id: string;
  transaction_date: string;
  notes: string | null;
};
type Outlet = { id: string; name: string };

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const numberFormat = (n: number) =>
  new Intl.NumberFormat("id-ID").format(n);

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatDate = (date: string) => {
  if (!date) return "-";
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

export default function HistoryPage() {
  const [supabase] = useState(() => createClient());

  const [products, setProducts] = useState<Product[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [values, setValues] = useState<ValueRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [searchTransaction, setSearchTransaction] = useState("");
  const [expandedValues, setExpandedValues] = useState(true);
  const [expandedTransactions, setExpandedTransactions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      window.location.href = "/login";
      return;
    }

    const start = `${month}-01`;
    const [yearNumber, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(yearNumber, monthNumber, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, "0")}`;

    const [p, o, v, t] = await Promise.all([
      supabase
        .from("products")
        .select("id,name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("outlets")
        .select("id,name")
        .eq("user_id", auth.user.id)
        .order("name"),
      supabase
        .from("daily_product_values")
        .select("id,product_id,entry_date,value")
        .eq("user_id", auth.user.id)
        .gte("entry_date", start)
        .lte("entry_date", end)
        .order("entry_date", { ascending: false }),
      supabase
        .from("daily_outlet_transactions")
        .select("id,product_id,outlet_id,transaction_date,notes")
        .eq("user_id", auth.user.id)
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .order("transaction_date", { ascending: false }),
    ]);

    if (p.error || o.error || v.error || t.error) {
      setError(
        p.error?.message ||
          o.error?.message ||
          v.error?.message ||
          t.error?.message ||
          "Gagal memuat riwayat."
      );
    }

    setProducts((p.data ?? []) as Product[]);
    setOutlets((o.data ?? []) as Outlet[]);
    setValues((v.data ?? []) as ValueRow[]);
    setTransactions((t.data ?? []) as TxRow[]);
    setLoading(false);
    setRefreshing(false);
  }, [month, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products]
  );

  const outletMap = useMemo(
    () => new Map(outlets.map((outlet) => [outlet.id, outlet.name])),
    [outlets]
  );

  const totalValue = useMemo(
    () => values.reduce((sum, row) => sum + Number(row.value || 0), 0),
    [values]
  );

  const uniqueValueDays = useMemo(
    () => new Set(values.map((row) => row.entry_date)).size,
    [values]
  );

  const uniqueTransactionOutlets = useMemo(
    () => new Set(transactions.map((row) => row.outlet_id)).size,
    [transactions]
  );

  const filteredValues = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return values;

    return values.filter((row) => {
      const productName = productMap.get(row.product_id) ?? "Produk";
      return (
        productName.toLowerCase().includes(query) ||
        formatDate(row.entry_date).toLowerCase().includes(query) ||
        row.entry_date.includes(query)
      );
    });
  }, [values, searchValue, productMap]);

  const filteredTransactions = useMemo(() => {
    const query = searchTransaction.trim().toLowerCase();
    if (!query) return transactions;

    return transactions.filter((row) => {
      const productName = productMap.get(row.product_id) ?? "Produk";
      const outletName = outletMap.get(row.outlet_id) ?? "Outlet";
      return (
        productName.toLowerCase().includes(query) ||
        outletName.toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query) ||
        formatDate(row.transaction_date).toLowerCase().includes(query) ||
        row.transaction_date.includes(query)
      );
    });
  }, [transactions, searchTransaction, productMap, outletMap]);

  return (
    <AppShell>
      <div className="history-page">
        <header className="history-header">
          <div className="history-heading">
            <div className="history-heading-icon">
              <History size={24} />
            </div>
            <div>
              <span className="history-eyebrow">ACTIVITY RECORDS</span>
              <h1 className="page-title">Riwayat Pencatatan</h1>
              <p className="page-subtitle">
                Pantau catatan value produk dan transaksi outlet berdasarkan
                periode yang dipilih.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="history-refresh"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "history-spin" : ""}
            />
            <span>{refreshing ? "Memuat..." : "Muat Ulang"}</span>
          </button>
        </header>

        <section className="history-filter-panel">
          <div className="filter-icon">
            <CalendarDays size={21} />
          </div>

          <div className="filter-content">
            <label htmlFor="history-month">Periode riwayat</label>
            <input
              id="history-month"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) setMonth(event.target.value);
              }}
            />
          </div>

          <div className="filter-selected">
            <span>Bulan yang dipilih</span>
            <strong>{formatMonth(month)}</strong>
          </div>
        </section>

        {error && (
          <div className="history-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <section className="history-stats">
          <article className="history-stat-card">
            <div className="history-stat-top">
              <div className="history-stat-icon value-color">
                <Wallet size={20} />
              </div>
              <span className="stat-chip">VALUE</span>
            </div>
            <span className="history-stat-label">Total Value Bulanan</span>
            <strong className="history-stat-number money-number">
              {money(totalValue)}
            </strong>
            <span className="history-stat-note">
              {numberFormat(values.length)} catatan value
            </span>
          </article>

          <article className="history-stat-card">
            <div className="history-stat-top">
              <div className="history-stat-icon transaction-color">
                <ClipboardCheck size={20} />
              </div>
              <span className="stat-chip">TRANSAKSI</span>
            </div>
            <span className="history-stat-label">Outlet Transaksi</span>
            <strong className="history-stat-number">
              {numberFormat(transactions.length)}
            </strong>
            <span className="history-stat-note">
              {numberFormat(uniqueTransactionOutlets)} outlet berbeda
            </span>
          </article>

          <article className="history-stat-card">
            <div className="history-stat-top">
              <div className="history-stat-icon date-color">
                <CalendarDays size={20} />
              </div>
              <span className="stat-chip">AKTIVITAS</span>
            </div>
            <span className="history-stat-label">Hari Update Value</span>
            <strong className="history-stat-number">
              {numberFormat(uniqueValueDays)}
            </strong>
            <span className="history-stat-note">
              Hari dengan pencatatan value
            </span>
          </article>
        </section>

        <section className="history-section">
          <div className="history-section-header">
            <div className="history-section-title">
              <div className="section-icon value-color">
                <TrendingUp size={19} />
              </div>
              <div>
                <h2>Riwayat Value Produk</h2>
                <p>
                  {numberFormat(filteredValues.length)} dari{" "}
                  {numberFormat(values.length)} catatan
                </p>
              </div>
            </div>

            <button
              type="button"
              className="collapse-btn"
              onClick={() => setExpandedValues((old) => !old)}
              aria-expanded={expandedValues}
            >
              {expandedValues ? (
                <>
                  <span>Tutup</span>
                  <ChevronUp size={17} />
                </>
              ) : (
                <>
                  <span>Lihat</span>
                  <ChevronDown size={17} />
                </>
              )}
            </button>
          </div>

          {expandedValues && (
            <>
              <div className="history-search">
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Cari nama produk atau tanggal..."
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  aria-label="Cari riwayat value"
                />
              </div>

              {loading ? (
                <div className="history-empty">
                  <span className="history-loader" />
                  <p>Memuat riwayat value...</p>
                </div>
              ) : filteredValues.length === 0 ? (
                <div className="history-empty">
                  <div className="empty-icon">
                    <FileClock size={25} />
                  </div>
                  <strong>
                    {searchValue
                      ? "Riwayat tidak ditemukan"
                      : "Belum ada riwayat value"}
                  </strong>
                  <p>
                    {searchValue
                      ? "Coba kata kunci atau tanggal yang berbeda."
                      : `Belum ada pencatatan value untuk ${formatMonth(month)}.`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="history-table-wrap">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Produk</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredValues.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <div className="date-cell">
                                <CalendarDays size={15} />
                                <span>{formatDate(row.entry_date)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="history-product">
                                <div className="mini-product-icon">
                                  <Package size={16} />
                                </div>
                                <strong>
                                  {productMap.get(row.product_id) ?? "Produk"}
                                </strong>
                              </div>
                            </td>
                            <td>
                              <strong className="value-amount">
                                {money(Number(row.value || 0))}
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="history-mobile-list">
                    {filteredValues.map((row) => (
                      <article className="history-mobile-card" key={row.id}>
                        <div className="history-mobile-card-top">
                          <div className="history-product">
                            <div className="mini-product-icon">
                              <Package size={16} />
                            </div>
                            <strong>
                              {productMap.get(row.product_id) ?? "Produk"}
                            </strong>
                          </div>
                          <strong className="value-amount">
                            {money(Number(row.value || 0))}
                          </strong>
                        </div>
                        <div className="mobile-date">
                          <CalendarDays size={14} />
                          {formatDate(row.entry_date)}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className="history-section">
          <div className="history-section-header">
            <div className="history-section-title">
              <div className="section-icon transaction-color">
                <Store size={19} />
              </div>
              <div>
                <h2>Riwayat Outlet Transaksi</h2>
                <p>
                  {numberFormat(filteredTransactions.length)} dari{" "}
                  {numberFormat(transactions.length)} catatan
                </p>
              </div>
            </div>

            <button
              type="button"
              className="collapse-btn"
              onClick={() => setExpandedTransactions((old) => !old)}
              aria-expanded={expandedTransactions}
            >
              {expandedTransactions ? (
                <>
                  <span>Tutup</span>
                  <ChevronUp size={17} />
                </>
              ) : (
                <>
                  <span>Lihat</span>
                  <ChevronDown size={17} />
                </>
              )}
            </button>
          </div>

          {expandedTransactions && (
            <>
              <div className="history-search">
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Cari outlet, produk, keterangan..."
                  value={searchTransaction}
                  onChange={(event) =>
                    setSearchTransaction(event.target.value)
                  }
                  aria-label="Cari riwayat transaksi"
                />
              </div>

              {loading ? (
                <div className="history-empty">
                  <span className="history-loader" />
                  <p>Memuat riwayat transaksi...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="history-empty">
                  <div className="empty-icon">
                    <Store size={25} />
                  </div>
                  <strong>
                    {searchTransaction
                      ? "Transaksi tidak ditemukan"
                      : "Belum ada riwayat transaksi"}
                  </strong>
                  <p>
                    {searchTransaction
                      ? "Coba kata kunci atau tanggal yang berbeda."
                      : `Belum ada transaksi outlet untuk ${formatMonth(month)}.`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="history-table-wrap">
                    <table className="history-table transaction-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Outlet</th>
                          <th>Produk</th>
                          <th>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <div className="date-cell">
                                <CalendarDays size={15} />
                                <span>
                                  {formatDate(row.transaction_date)}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="history-product">
                                <div className="mini-outlet-icon">
                                  <Store size={15} />
                                </div>
                                <strong>
                                  {outletMap.get(row.outlet_id) ?? "Outlet"}
                                </strong>
                              </div>
                            </td>
                            <td>
                              <span className="product-badge">
                                {productMap.get(row.product_id) ?? "Produk"}
                              </span>
                            </td>
                            <td className="notes-cell">
                              {row.notes?.trim() || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="history-mobile-list">
                    {filteredTransactions.map((row) => (
                      <article className="history-mobile-card" key={row.id}>
                        <div className="history-mobile-card-top">
                          <div className="history-product">
                            <div className="mini-outlet-icon">
                              <Store size={15} />
                            </div>
                            <strong>
                              {outletMap.get(row.outlet_id) ?? "Outlet"}
                            </strong>
                          </div>
                          <span className="product-badge">
                            {productMap.get(row.product_id) ?? "Produk"}
                          </span>
                        </div>
                        <div className="mobile-date">
                          <CalendarDays size={14} />
                          {formatDate(row.transaction_date)}
                        </div>
                        <div className="mobile-notes">
                          <span>Keterangan</span>
                          <p>{row.notes?.trim() || "—"}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <div className="history-bottom-note">
          <div className="bottom-note-icon">
            <History size={17} />
          </div>
          <p>
            Menampilkan riwayat untuk{" "}
            <strong>{formatMonth(month)}</strong>. Data mengikuti akun yang
            sedang login.
          </p>
        </div>
      </div>

      <style jsx global>{`
        .history-page {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding-bottom: 30px;
          color: var(--text, #17263b);
        }

        .history-page * {
          box-sizing: border-box;
        }

        .history-page .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 23px;
        }

        .history-page .history-heading {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }

        .history-page .history-heading-icon {
          display: grid;
          place-items: center;
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          color: #fff;
          border-radius: 15px;
          background: linear-gradient(135deg, #287de9, #1854b7);
          box-shadow: 0 7px 18px rgba(31, 102, 206, 0.2);
        }

        .history-page .history-eyebrow {
          display: block;
          margin-bottom: 5px;
          color: #2473d9;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .history-page .page-title {
          margin: 0;
          font-size: clamp(23px, 2.3vw, 30px);
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.8px;
        }

        .history-page .page-subtitle {
          max-width: 720px;
          margin: 7px 0 0;
          color: var(--muted, #748297);
          font-size: 13px;
          line-height: 1.7;
        }

        .history-page .history-refresh {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 14px;
          color: var(--text, #34465e);
          background: var(--card, #fff);
          border: 1px solid var(--border, #dfe7f0);
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .history-page .history-refresh:hover:not(:disabled) {
          color: #1768ca;
          border-color: #91bdf1;
          background: #f1f7ff;
        }

        .history-page button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .history-page .history-filter-panel {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 19px;
          padding: 17px 20px;
          background: var(--card, #fff);
          border: 1px solid var(--border, #e1e8f0);
          border-radius: 14px;
          box-shadow: 0 3px 12px rgba(24, 43, 72, 0.025);
        }

        .history-page .filter-icon {
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          color: #176bd1;
          background: #edf5ff;
          border-radius: 12px;
        }

        .history-page .filter-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 220px;
          max-width: 100%;
        }

        .history-page .filter-content label {
          color: var(--muted, #6d7d92);
          font-size: 11px;
          font-weight: 700;
        }

        .history-page .filter-content input {
          width: 100%;
          min-height: 36px;
          padding: 7px 10px;
          color: var(--text, #17263b);
          background: var(--surface, #f8fafc);
          border: 1px solid var(--border, #dfe7f0);
          border-radius: 8px;
          font: inherit;
          font-size: 12px;
          outline: none;
        }

        .history-page .filter-content input:focus {
          border-color: #3a8ae8;
          box-shadow: 0 0 0 3px rgba(43, 125, 226, 0.1);
        }

        .history-page .filter-selected {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-left: auto;
          text-align: right;
        }

        .history-page .filter-selected span {
          color: var(--muted, #8b97a7);
          font-size: 10px;
        }

        .history-page .filter-selected strong {
          color: var(--text, #2a3e57);
          font-size: 13px;
          font-weight: 800;
          text-transform: capitalize;
        }

        .history-page .history-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 22px;
        }

        .history-page .history-stat-card {
          min-width: 0;
          padding: 19px;
          background: var(--card, #fff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 15px;
          box-shadow: 0 3px 12px rgba(24, 43, 72, 0.03);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .history-page .history-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(24, 43, 72, 0.065);
        }

        .history-page .history-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 17px;
        }

        .history-page .history-stat-icon,
        .history-page .section-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 41px;
          height: 41px;
          border-radius: 12px;
        }

        .history-page .value-color {
          color: #176bd1;
          background: #eaf3ff;
        }

        .history-page .transaction-color {
          color: #07865b;
          background: #e6f8ef;
        }

        .history-page .date-color {
          color: #7951d5;
          background: #f0eaff;
        }

        .history-page .stat-chip {
          padding: 5px 8px;
          color: var(--muted, #728198);
          background: var(--surface, #f5f7fb);
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.6px;
        }

        .history-page .history-stat-label {
          display: block;
          margin-bottom: 8px;
          color: var(--muted, #718096);
          font-size: 12px;
          font-weight: 600;
        }

        .history-page .history-stat-number {
          display: block;
          color: var(--text, #18283e);
          font-size: clamp(25px, 2.2vw, 32px);
          font-weight: 800;
          letter-spacing: -0.8px;
          overflow-wrap: anywhere;
        }

        .history-page .money-number {
          font-size: clamp(19px, 1.9vw, 27px);
        }

        .history-page .history-stat-note {
          display: block;
          margin-top: 8px;
          color: var(--muted, #8995a6);
          font-size: 11px;
          line-height: 1.5;
        }

        .history-page .history-section {
          margin-bottom: 19px;
          overflow: hidden;
          background: var(--card, #fff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 15px;
          box-shadow: 0 3px 13px rgba(24, 43, 72, 0.03);
        }

        .history-page .history-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 22px;
          border-bottom: 1px solid var(--border, #e8edf3);
        }

        .history-page .history-section-title {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .history-page .section-icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
        }

        .history-page .history-section-title h2 {
          margin: 0;
          color: var(--text, #192a40);
          font-size: 15px;
          font-weight: 800;
        }

        .history-page .history-section-title p {
          margin: 5px 0 0;
          color: var(--muted, #8290a3);
          font-size: 11px;
        }

        .history-page .collapse-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 34px;
          padding: 0 10px;
          color: var(--muted, #64758a);
          background: var(--surface, #f7f9fc);
          border: 1px solid var(--border, #e1e7ef);
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .history-page .collapse-btn:hover {
          color: #176bd1;
          border-color: #a9cdf7;
        }

        .history-page .history-search {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 40px;
          margin: 17px 22px;
          padding: 0 12px;
          color: var(--muted, #8290a3);
          background: var(--surface, #f8fafc);
          border: 1px solid var(--border, #e1e8f0);
          border-radius: 9px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .history-page .history-search:focus-within {
          border-color: #3a8ae8;
          box-shadow: 0 0 0 3px rgba(43, 125, 226, 0.08);
        }

        .history-page .history-search input {
          width: 100%;
          min-width: 0;
          height: 38px;
          color: var(--text, #25384f);
          background: transparent;
          border: 0;
          outline: none;
          font: inherit;
          font-size: 12px;
        }

        .history-page .history-search input::placeholder {
          color: #98a3b2;
        }

        .history-page .history-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .history-page .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .history-page .history-table th {
          padding: 12px 22px;
          color: var(--muted, #718096);
          background: var(--surface, #f7f9fc);
          border-top: 1px solid var(--border, #e9edf3);
          border-bottom: 1px solid var(--border, #e5eaf1);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.45px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .history-page .history-table td {
          padding: 14px 22px;
          color: var(--text, #33445a);
          border-bottom: 1px solid var(--border, #edf0f5);
          font-size: 12px;
          vertical-align: middle;
        }

        .history-page .history-table tbody tr {
          transition: background 0.15s;
        }

        .history-page .history-table tbody tr:hover {
          background: var(--surface, #f8fbff);
        }

        .history-page .history-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .history-page .date-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted, #718096);
          white-space: nowrap;
        }

        .history-page .date-cell :global(svg) {
          flex-shrink: 0;
          color: #5f91ce;
        }

        .history-page .history-product {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .history-page .history-product > strong {
          color: var(--text, #27394f);
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .history-page .mini-product-icon,
        .history-page .mini-outlet-icon {
          display: grid;
          place-items: center;
          flex: 0 0 31px;
          width: 31px;
          height: 31px;
          color: #2875d2;
          background: #edf5ff;
          border-radius: 9px;
        }

        .history-page .mini-outlet-icon {
          color: #0a8b60;
          background: #e8f8f0;
        }

        .history-page .value-amount {
          color: #07865b;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .history-page .product-badge {
          display: inline-flex;
          max-width: 230px;
          padding: 6px 9px;
          color: #2369b8;
          background: #edf5ff;
          border: 1px solid #deebff;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .history-page .notes-cell {
          max-width: 260px;
          color: var(--muted, #728096) !important;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .history-page .history-mobile-list {
          display: none;
        }

        .history-page .history-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 175px;
          padding: 25px 18px;
          color: var(--muted, #8190a3);
          text-align: center;
        }

        .history-page .history-empty > strong {
          margin-top: 12px;
          color: var(--text, #293c54);
          font-size: 13px;
        }

        .history-page .history-empty p {
          max-width: 340px;
          margin: 7px 0 0;
          font-size: 11px;
          line-height: 1.7;
        }

        .history-page .empty-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          color: #6e8db4;
          background: var(--surface, #f1f5fa);
          border-radius: 14px;
        }

        .history-page .history-loader {
          width: 24px;
          height: 24px;
          border: 3px solid var(--border, #dfe7f0);
          border-top-color: #287de9;
          border-radius: 50%;
          animation: history-spin 0.7s linear infinite;
        }

        .history-page .history-error {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-bottom: 18px;
          padding: 12px 14px;
          color: #b42318;
          background: #fff0ef;
          border: 1px solid #ffd2cf;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .history-page .history-error :global(svg) {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .history-page .history-bottom-note {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 16px;
          background: var(--surface, #f7f9fc);
          border: 1px solid var(--border, #e3e9f1);
          border-radius: 11px;
        }

        .history-page .bottom-note-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 33px;
          height: 33px;
          color: #2775d3;
          background: #eaf3ff;
          border-radius: 9px;
        }

        .history-page .history-bottom-note p {
          margin: 0;
          color: var(--muted, #718096);
          font-size: 11px;
          line-height: 1.7;
        }

        .history-page .history-bottom-note strong {
          color: var(--text, #2d4057);
          text-transform: capitalize;
        }

        .history-page .history-spin {
          animation: history-spin 0.8s linear infinite;
        }

        @keyframes history-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1000px) {
          .history-page .history-stats {
            gap: 11px;
          }

          .history-page .history-stat-card {
            padding: 16px;
          }

          .history-page .history-table th,
          .history-page .history-table td {
            padding-right: 15px;
            padding-left: 15px;
          }
        }

        @media (max-width: 700px) {
          .history-page {
            padding-bottom: 20px;
          }

          .history-page .history-header {
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 17px;
          }

          .history-page .history-heading {
            gap: 11px;
          }

          .history-page .history-heading-icon {
            flex-basis: 41px;
            width: 41px;
            height: 41px;
            border-radius: 12px;
          }

          .history-page .history-heading-icon :global(svg) {
            width: 21px;
            height: 21px;
          }

          .history-page .history-eyebrow {
            font-size: 9px;
            letter-spacing: 1px;
          }

          .history-page .page-title {
            font-size: 21px;
            letter-spacing: -0.5px;
          }

          .history-page .page-subtitle {
            margin-top: 6px;
            font-size: 11px;
            line-height: 1.65;
          }

          .history-page .history-refresh {
            flex-shrink: 0;
            width: 38px;
            min-width: 38px;
            height: 38px;
            min-height: 38px;
            padding: 0;
          }

          .history-page .history-refresh span {
            display: none;
          }

          .history-page .history-filter-panel {
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 14px;
            padding: 13px;
            border-radius: 12px;
          }

          .history-page .filter-icon {
            flex-basis: 36px;
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }

          .history-page .filter-content {
            flex: 1;
            width: auto;
            min-width: 130px;
          }

          .history-page .filter-selected {
            width: 100%;
            margin-left: 46px;
            text-align: left;
          }

          .history-page .filter-selected strong {
            font-size: 12px;
          }

          .history-page .history-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 15px;
          }

          .history-page .history-stat-card {
            padding: 13px;
            border-radius: 12px;
          }

          .history-page .history-stat-card:last-child {
            grid-column: 1 / -1;
          }

          .history-page .history-stat-top {
            margin-bottom: 12px;
          }

          .history-page .history-stat-icon {
            width: 35px;
            height: 35px;
            border-radius: 10px;
          }

          .history-page .history-stat-icon :global(svg) {
            width: 18px;
            height: 18px;
          }

          .history-page .stat-chip {
            padding: 4px 6px;
            font-size: 8px;
          }

          .history-page .history-stat-label {
            margin-bottom: 6px;
            font-size: 10px;
          }

          .history-page .history-stat-number {
            font-size: 25px;
          }

          .history-page .money-number {
            font-size: clamp(17px, 4.7vw, 23px);
          }

          .history-page .history-stat-note {
            margin-top: 6px;
            font-size: 10px;
          }

          .history-page .history-section {
            margin-bottom: 14px;
            border-radius: 12px;
          }

          .history-page .history-section-header {
            padding: 14px;
          }

          .history-page .history-section-title {
            gap: 9px;
          }

          .history-page .section-icon {
            width: 35px;
            height: 35px;
            border-radius: 10px;
          }

          .history-page .section-icon :global(svg) {
            width: 17px;
            height: 17px;
          }

          .history-page .history-section-title h2 {
            font-size: 12px;
          }

          .history-page .history-section-title p {
            margin-top: 4px;
            font-size: 10px;
          }

          .history-page .collapse-btn {
            min-height: 31px;
            gap: 4px;
            padding: 0 7px;
            font-size: 10px;
          }

          .history-page .history-search {
            min-height: 38px;
            margin: 13px 12px;
            padding: 0 10px;
          }

          .history-page .history-search input {
            height: 36px;
            font-size: 11px;
          }

          .history-page .history-table-wrap {
            display: none;
          }

          .history-page .history-mobile-list {
            display: grid;
            gap: 9px;
            padding: 0 12px 13px;
          }

          .history-page .history-mobile-card {
            min-width: 0;
            padding: 12px;
            border: 1px solid var(--border, #e4eaf2);
            border-radius: 10px;
            background: var(--card, #fff);
          }

          .history-page .history-mobile-card-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
          }

          .history-page .history-mobile-card-top .history-product {
            min-width: 0;
          }

          .history-page .history-mobile-card-top .history-product > strong {
            font-size: 11px;
          }

          .history-page .mini-product-icon,
          .history-page .mini-outlet-icon {
            flex-basis: 29px;
            width: 29px;
            height: 29px;
          }

          .history-page .value-amount {
            flex-shrink: 0;
            font-size: 11px;
            white-space: normal;
            text-align: right;
            overflow-wrap: anywhere;
          }

          .history-page .mobile-date {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 11px;
            color: var(--muted, #7d8ba0);
            font-size: 10px;
          }

          .history-page .mobile-date :global(svg) {
            color: #6493ca;
          }

          .history-page .product-badge {
            max-width: 48%;
            padding: 5px 7px;
            font-size: 9px;
          }

          .history-page .mobile-notes {
            margin-top: 11px;
            padding-top: 10px;
            border-top: 1px solid var(--border, #edf0f5);
          }

          .history-page .mobile-notes > span {
            color: var(--muted, #8995a6);
            font-size: 9px;
            font-weight: 700;
          }

          .history-page .mobile-notes p {
            margin: 5px 0 0;
            color: var(--text, #44566d);
            font-size: 11px;
            line-height: 1.6;
            overflow-wrap: anywhere;
          }

          .history-page .history-empty {
            min-height: 150px;
            padding: 20px 14px;
          }

          .history-page .history-bottom-note {
            align-items: flex-start;
            gap: 9px;
            padding: 11px;
          }

          .history-page .bottom-note-icon {
            width: 30px;
            height: 30px;
          }

          .history-page .history-bottom-note p {
            font-size: 10px;
          }
        }

        @media (max-width: 360px) {
          .history-page .page-title {
            font-size: 19px;
          }

          .history-page .history-stat-card {
            padding: 10px;
          }

          .history-page .history-stat-number {
            font-size: 22px;
          }

          .history-page .money-number {
            font-size: 16px;
          }

          .history-page .history-section-title h2 {
            font-size: 11px;
          }

          .history-page .collapse-btn span {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .history-page *,
          .history-page *::before,
          .history-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
