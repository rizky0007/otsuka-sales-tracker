
"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import {
  Target,
  Wallet,
  CalendarDays,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package,
  TrendingUp,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  code: string;
};

type TargetRow = {
  product_id: string;
  outlet_target: number;
  value_target: number;
};

type ProductTarget = {
  outlet: string;
  value: string;
};

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.slice(0, 7).split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

export default function TargetPage() {
  const [supabase] = useState(() => createClient());

  const [products, setProducts] = useState<Product[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [targets, setTargets] = useState<Record<string, ProductTarget>>({});
  const [loading, setLoading] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error: productError } = await supabase
      .from("products")
      .select("id,name,code")
      .eq("active", true)
      .order("name");

    if (productError) {
      setError(`Gagal memuat produk: ${productError.message}`);
      setLoading(false);
      return;
    }

    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [supabase]);

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true);
    setMessage("");
    setError("");

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      setError("Sesi login berakhir. Silakan login kembali.");
      setLoadingTargets(false);
      return;
    }

    const { data, error: targetError } = await supabase
      .from("monthly_targets")
      .select("product_id,outlet_target,value_target")
      .eq("user_id", auth.user.id)
      .eq("month", month);

    if (targetError) {
      setError(`Gagal memuat target: ${targetError.message}`);
      setLoadingTargets(false);
      return;
    }

    const next: Record<string, ProductTarget> = {};

    (data ?? []).forEach((row: TargetRow) => {
      next[row.product_id] = {
        outlet: String(row.outlet_target ?? 0),
        value: String(row.value_target ?? 0),
      };
    });

    setTargets(next);
    setLoadingTargets(false);
  }, [month, supabase]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!loading) {
      void loadTargets();
    }
  }, [loading, loadTargets]);

  function updateTarget(
    productId: string,
    field: keyof ProductTarget,
    value: string
  ) {
    setTargets((old) => ({
      ...old,
      [productId]: {
        outlet: old[productId]?.outlet ?? "",
        value: old[productId]?.value ?? "",
        [field]: value,
      },
    }));
    setMessage("");
    setError("");
  }

  async function save() {
    if (saving || loading || loadingTargets) return;

    setSaving(true);
    setMessage("");
    setError("");

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      setError("Sesi login berakhir. Silakan login kembali.");
      setSaving(false);
      return;
    }

    const rows = products.map((product) => ({
      user_id: auth.user!.id,
      product_id: product.id,
      month,
      outlet_target: Math.max(
        0,
        Math.floor(Number(targets[product.id]?.outlet || 0))
      ),
      value_target: Math.max(
        0,
        Number(targets[product.id]?.value || 0)
      ),
    }));

    if (rows.some((row) =>
      !Number.isFinite(row.outlet_target) ||
      !Number.isFinite(row.value_target)
    )) {
      setError("Pastikan semua nilai target diisi dengan angka yang valid.");
      setSaving(false);
      return;
    }

    const { error: saveError } = await supabase
      .from("monthly_targets")
      .upsert(rows, {
        onConflict: "user_id,product_id,month",
      });

    if (saveError) {
      setError(`Gagal menyimpan target: ${saveError.message}`);
    } else {
      setMessage(`Target bulan ${monthLabel(month)} berhasil disimpan.`);
    }

    setSaving(false);
  }

  const outletTotal = products.reduce(
    (sum, product) =>
      sum + Math.max(0, Math.floor(Number(targets[product.id]?.outlet || 0))),
    0
  );

  const valueTotal = products.reduce(
    (sum, product) =>
      sum + Math.max(0, Number(targets[product.id]?.value || 0)),
    0
  );

  const configuredProducts = products.filter(
    (product) =>
      Number(targets[product.id]?.outlet || 0) > 0 ||
      Number(targets[product.id]?.value || 0) > 0
  ).length;

  return (
    <AppShell>
      <div className="target-page">
        <div className="page-header">
          <div className="page-heading">
            <div className="heading-icon">
              <Target size={24} />
            </div>
            <div>
              <div className="eyebrow">SALES MANAGEMENT</div>
              <h1 className="page-title">Pengaturan Target</h1>
              <p className="page-subtitle">
                Atur target outlet transaksi dan target penjualan setiap produk
                untuk memantau pencapaian bulanan.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={() => void loadTargets()}
            disabled={loading || loadingTargets || saving}
          >
            <RefreshCw
              size={16}
              className={loadingTargets ? "spin" : ""}
            />
            <span>Muat Ulang</span>
          </button>
        </div>

        <section className="summary-grid">
          <article className="summary-card blue-card">
            <div className="summary-top">
              <div className="summary-icon blue-icon">
                <Target size={21} />
              </div>
              <span className="summary-tag">OUTLET</span>
            </div>
            <p className="summary-label">Total Target Outlet</p>
            <h2 className="summary-value">{numberFormat(outletTotal)}</h2>
            <p className="summary-note">
              Akumulasi target transaksi semua produk
            </p>
          </article>

          <article className="summary-card green-card">
            <div className="summary-top">
              <div className="summary-icon green-icon">
                <Wallet size={21} />
              </div>
              <span className="summary-tag">PENJUALAN</span>
            </div>
            <p className="summary-label">Total Target Value</p>
            <h2 className="summary-value money-value">
              {money(valueTotal)}
            </h2>
            <p className="summary-note">
              Akumulasi target nilai penjualan
            </p>
          </article>

          <article className="summary-card purple-card">
            <div className="summary-top">
              <div className="summary-icon purple-icon">
                <Package size={21} />
              </div>
              <span className="summary-tag">PRODUK</span>
            </div>
            <p className="summary-label">Produk dengan Target</p>
            <h2 className="summary-value">
              {configuredProducts}
              <span className="summary-unit">/ {products.length}</span>
            </h2>
            <p className="summary-note">
              Produk yang sudah memiliki target
            </p>
          </article>
        </section>

        <section className="target-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <div className="panel-title-icon">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2>Target per Produk</h2>
                <p>
                  Masukkan target sesuai perencanaan penjualan bulanan.
                </p>
              </div>
            </div>

            <span className="product-count">
              {products.length} Produk
            </span>
          </div>

          <div className="month-filter">
            <div className="month-filter-icon">
              <CalendarDays size={19} />
            </div>
            <div className="month-field">
              <label htmlFor="target-month">Periode target</label>
              <input
                id="target-month"
                type="month"
                value={month.slice(0, 7)}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value) setMonth(`${value}-01`);
                }}
              />
            </div>
            <div className="month-description">
              <span>Periode dipilih</span>
              <strong>{monthLabel(month)}</strong>
            </div>
          </div>

          {loading || loadingTargets ? (
            <div className="loading-state">
              <span className="loading-spinner" />
              <p>
                {loading
                  ? "Memuat daftar produk..."
                  : "Memuat target bulanan..."}
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <Package size={32} />
              <h3>Produk belum tersedia</h3>
              <p>
                Pastikan tabel products memiliki produk aktif yang dapat
                digunakan.
              </p>
            </div>
          ) : (
            <>
              <div className="desktop-table-wrap">
                <table className="target-table">
                  <thead>
                    <tr>
                      <th className="product-column">Produk</th>
                      <th>Target Outlet Transaksi</th>
                      <th>Target Value (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-cell">
                            <div className="product-number">
                              {String(index + 1).padStart(2, "0")}
                            </div>
                            <div className="product-name">
                              <strong>{product.name}</strong>
                              <span>{product.code}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="input-with-suffix">
                            <input
                              aria-label={`Target outlet ${product.name}`}
                              type="number"
                              min="0"
                              step="1"
                              value={targets[product.id]?.outlet ?? ""}
                              placeholder="0"
                              onChange={(event) =>
                                updateTarget(
                                  product.id,
                                  "outlet",
                                  event.target.value
                                )
                              }
                            />
                            <span>Outlet</span>
                          </div>
                        </td>
                        <td>
                          <div className="value-input-wrap">
                            <span className="currency-prefix">Rp</span>
                            <input
                              aria-label={`Target value ${product.name}`}
                              type="number"
                              min="0"
                              step="1000"
                              value={targets[product.id]?.value ?? ""}
                              placeholder="0"
                              onChange={(event) =>
                                updateTarget(
                                  product.id,
                                  "value",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>
                        <strong>Total Target</strong>
                      </td>
                      <td>
                        <strong>{numberFormat(outletTotal)} Outlet</strong>
                      </td>
                      <td>
                        <strong>{money(valueTotal)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mobile-product-list">
                {products.map((product, index) => (
                  <article className="mobile-product-card" key={product.id}>
                    <div className="mobile-product-heading">
                      <div className="product-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="product-name">
                        <strong>{product.name}</strong>
                        <span>{product.code}</span>
                      </div>
                    </div>

                    <div className="mobile-input-grid">
                      <div className="field-group">
                        <label htmlFor={`outlet-${product.id}`}>
                          <Target size={14} />
                          Target Outlet
                        </label>
                        <div className="mobile-input">
                          <input
                            id={`outlet-${product.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={targets[product.id]?.outlet ?? ""}
                            placeholder="0"
                            onChange={(event) =>
                              updateTarget(
                                product.id,
                                "outlet",
                                event.target.value
                              )
                            }
                          />
                          <span>Outlet</span>
                        </div>
                      </div>

                      <div className="field-group">
                        <label htmlFor={`value-${product.id}`}>
                          <Wallet size={14} />
                          Target Value
                        </label>
                        <div className="mobile-input">
                          <span className="mobile-rp">Rp</span>
                          <input
                            id={`value-${product.id}`}
                            type="number"
                            min="0"
                            step="1000"
                            value={targets[product.id]?.value ?? ""}
                            placeholder="0"
                            onChange={(event) =>
                              updateTarget(
                                product.id,
                                "value",
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="total-strip">
                <div className="total-strip-item">
                  <span>Total Target Outlet</span>
                  <strong>{numberFormat(outletTotal)} Outlet</strong>
                </div>
                <div className="total-strip-item">
                  <span>Total Target Value</span>
                  <strong>{money(valueTotal)}</strong>
                </div>
              </div>
            </>
          )}

          {message && (
            <div className="feedback success-feedback" role="status">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="feedback error-feedback" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="panel-footer">
            <div className="footer-info">
              <span className="footer-dot" />
              <span>
                Perubahan untuk periode{" "}
                <strong>{monthLabel(month)}</strong>
              </span>
            </div>
            <button
              type="button"
              className="save-btn"
              onClick={() => void save()}
              disabled={
                saving ||
                loading ||
                loadingTargets ||
                products.length === 0
              }
            >
              {saving ? (
                <>
                  <RefreshCw size={17} className="spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Simpan Target
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .target-page {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding-bottom: 32px;
          color: var(--text, #152238);
        }

        .target-page * {
          box-sizing: border-box;
        }

        .target-page .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .target-page .page-heading {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }

        .target-page .heading-icon {
          display: grid;
          place-items: center;
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          color: #fff;
          border-radius: 15px;
          background: linear-gradient(135deg, #1677ed, #1555bf);
          box-shadow: 0 7px 18px rgba(21, 101, 216, 0.2);
        }

        .target-page .eyebrow {
          margin-bottom: 5px;
          color: #2473d9;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .target-page .page-title {
          margin: 0;
          font-size: clamp(23px, 2.3vw, 30px);
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.8px;
        }

        .target-page .page-subtitle {
          max-width: 690px;
          margin: 7px 0 0;
          color: var(--muted, #718096);
          font-size: 13px;
          line-height: 1.7;
        }

        .target-page .refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 14px;
          color: var(--text, #34445b);
          background: var(--card, #fff);
          border: 1px solid var(--border, #e0e7ef);
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .target-page .refresh-btn:hover:not(:disabled) {
          color: #1769cf;
          border-color: #83b8f5;
          background: #f2f7ff;
        }

        .target-page button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .target-page .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 23px;
        }

        .target-page .summary-card {
          min-width: 0;
          padding: 20px;
          overflow: hidden;
          border: 1px solid var(--border, #e4eaf2);
          border-radius: 16px;
          background: var(--card, #fff);
          box-shadow: 0 3px 12px rgba(21, 41, 71, 0.035);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .target-page .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 9px 24px rgba(21, 41, 71, 0.075);
        }

        .target-page .summary-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }

        .target-page .summary-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
        }

        .target-page .blue-icon {
          color: #176bd1;
          background: #eaf3ff;
        }

        .target-page .green-icon {
          color: #07865b;
          background: #e6f8ef;
        }

        .target-page .purple-icon {
          color: #7951d5;
          background: #f0eaff;
        }

        .target-page .summary-tag {
          padding: 5px 8px;
          color: var(--muted, #6b7b90);
          background: var(--surface, #f5f7fb);
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .target-page .summary-label {
          margin: 0 0 8px;
          color: var(--muted, #748196);
          font-size: 12px;
          font-weight: 600;
        }

        .target-page .summary-value {
          margin: 0;
          color: var(--text, #152238);
          font-size: clamp(25px, 2.2vw, 32px);
          font-weight: 800;
          letter-spacing: -0.8px;
          overflow-wrap: anywhere;
        }

        .target-page .money-value {
          font-size: clamp(20px, 1.9vw, 28px);
        }

        .target-page .summary-unit {
          margin-left: 5px;
          color: var(--muted, #8995a6);
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0;
        }

        .target-page .summary-note {
          margin: 8px 0 0;
          color: var(--muted, #8a96a8);
          font-size: 11px;
          line-height: 1.5;
        }

        .target-page .target-panel {
          overflow: hidden;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          background: var(--card, #fff);
          box-shadow: 0 4px 16px rgba(24, 43, 72, 0.035);
        }

        .target-page .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border, #e8edf3);
        }

        .target-page .panel-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .target-page .panel-title-icon {
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          color: #176bd1;
          background: #edf5ff;
          border-radius: 12px;
        }

        .target-page .panel-header h2 {
          margin: 0;
          color: var(--text, #152238);
          font-size: 16px;
          font-weight: 800;
        }

        .target-page .panel-header p {
          margin: 5px 0 0;
          color: var(--muted, #78869a);
          font-size: 12px;
          line-height: 1.5;
        }

        .target-page .product-count {
          flex-shrink: 0;
          padding: 7px 10px;
          color: #1766c2;
          background: #edf5ff;
          border: 1px solid #d9eaff;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
        }

        .target-page .month-filter {
          display: flex;
          align-items: center;
          gap: 13px;
          margin: 20px 24px;
          padding: 15px;
          border: 1px solid var(--border, #e3eaf3);
          border-radius: 12px;
          background: var(--surface, #f8fafc);
        }

        .target-page .month-filter-icon {
          display: grid;
          place-items: center;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          color: #176bd1;
          background: var(--card, #fff);
          border: 1px solid var(--border, #e0e7ef);
          border-radius: 11px;
        }

        .target-page .month-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: min(220px, 100%);
        }

        .target-page .month-field label,
        .target-page .field-group label {
          color: var(--muted, #65758b);
          font-size: 11px;
          font-weight: 700;
        }

        .target-page .month-field input {
          width: 100%;
          min-height: 37px;
          padding: 7px 10px;
          color: var(--text, #152238);
          background: var(--card, #fff);
          border: 1px solid var(--border, #dce5ef);
          border-radius: 8px;
          font: inherit;
          font-size: 12px;
          outline: none;
        }

        .target-page .month-field input:focus,
        .target-page .target-table input:focus,
        .target-page .mobile-input:focus-within {
          border-color: #3988e9;
          box-shadow: 0 0 0 3px rgba(43, 125, 226, 0.11);
        }

        .target-page .month-description {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-left: auto;
          text-align: right;
        }

        .target-page .month-description span {
          color: var(--muted, #8793a5);
          font-size: 10px;
        }

        .target-page .month-description strong {
          color: var(--text, #263a54);
          font-size: 12px;
          font-weight: 800;
          text-transform: capitalize;
        }

        .target-page .desktop-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .target-page .target-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .target-page .target-table th {
          padding: 13px 24px;
          color: var(--muted, #6c7b90);
          background: var(--surface, #f7f9fc);
          border-top: 1px solid var(--border, #e8edf3);
          border-bottom: 1px solid var(--border, #e8edf3);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.35px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .target-page .target-table td {
          padding: 15px 24px;
          border-bottom: 1px solid var(--border, #edf0f5);
          color: var(--text, #26364c);
          font-size: 12px;
          vertical-align: middle;
        }

        .target-page .target-table tbody tr {
          transition: background 0.15s ease;
        }

        .target-page .target-table tbody tr:hover {
          background: var(--surface, #f8fbff);
        }

        .target-page .target-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .target-page .product-column {
          min-width: 230px;
        }

        .target-page .product-cell,
        .target-page .mobile-product-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .target-page .product-number {
          display: grid;
          place-items: center;
          flex: 0 0 36px;
          width: 36px;
          height: 36px;
          color: #236bc1;
          background: #edf5ff;
          border: 1px solid #dceaff;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .target-page .product-name {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .target-page .product-name strong {
          color: var(--text, #1d2c41);
          font-size: 12px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        .target-page .product-name span {
          color: var(--muted, #8b97a8);
          font-size: 10px;
        }

        .target-page .input-with-suffix,
        .target-page .value-input-wrap {
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 225px;
          min-height: 39px;
          overflow: hidden;
          background: var(--card, #fff);
          border: 1px solid var(--border, #dfe7f0);
          border-radius: 8px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .target-page .input-with-suffix input,
        .target-page .value-input-wrap input {
          width: 100%;
          min-width: 0;
          height: 37px;
          padding: 7px 10px;
          color: var(--text, #1c2e44);
          background: transparent;
          border: 0;
          outline: none;
          font: inherit;
          font-size: 12px;
          font-weight: 650;
        }

        .target-page .input-with-suffix input:focus,
        .target-page .value-input-wrap input:focus {
          box-shadow: none;
        }

        .target-page .input-with-suffix > span {
          padding-right: 10px;
          color: var(--muted, #8b97a8);
          font-size: 10px;
        }

        .target-page .currency-prefix {
          padding-left: 10px;
          color: #16845b;
          font-size: 11px;
          font-weight: 800;
        }

        .target-page .value-input-wrap input {
          text-align: right;
        }

        .target-page .target-table input[type="number"],
        .target-page .mobile-input input[type="number"] {
          appearance: textfield;
          -moz-appearance: textfield;
        }

        .target-page .target-table input[type="number"]::-webkit-inner-spin-button,
        .target-page .target-table input[type="number"]::-webkit-outer-spin-button,
        .target-page .mobile-input input[type="number"]::-webkit-inner-spin-button,
        .target-page .mobile-input input[type="number"]::-webkit-outer-spin-button {
          margin: 0;
          -webkit-appearance: none;
        }

        .target-page .target-table tfoot td {
          padding-top: 17px;
          padding-bottom: 17px;
          color: var(--text, #1b3049);
          background: var(--surface, #f7f9fc);
          border-top: 1px solid var(--border, #e4eaf2);
          border-bottom: 0;
          font-size: 12px;
          font-weight: 800;
        }

        .target-page .mobile-product-list {
          display: none;
        }

        .target-page .total-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin: 18px 24px 0;
          padding: 15px 17px;
          background: var(--surface, #f7f9fc);
          border: 1px solid var(--border, #e4eaf2);
          border-radius: 11px;
        }

        .target-page .total-strip-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .target-page .total-strip-item span {
          color: var(--muted, #7b899c);
          font-size: 10px;
        }

        .target-page .total-strip-item strong {
          color: var(--text, #1e3551);
          font-size: 14px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .target-page .feedback {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 18px 24px 0;
          padding: 12px 14px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .target-page .success-feedback {
          color: #08754e;
          background: #e9f9f0;
          border: 1px solid #b9ecd0;
        }

        .target-page .error-feedback {
          color: #b42318;
          background: #fff0ef;
          border: 1px solid #ffd2cf;
        }

        .target-page .feedback :global(svg) {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .target-page .panel-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 20px;
          padding: 18px 24px;
          border-top: 1px solid var(--border, #e8edf3);
          background: var(--surface, #fafbfd);
        }

        .target-page .footer-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted, #7d8a9b);
          font-size: 11px;
          line-height: 1.5;
        }

        .target-page .footer-info strong {
          color: var(--text, #33445a);
          text-transform: capitalize;
        }

        .target-page .footer-dot {
          flex-shrink: 0;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #19a66c;
          box-shadow: 0 0 0 3px rgba(25, 166, 108, 0.12);
        }

        .target-page .save-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 43px;
          padding: 0 19px;
          color: #fff;
          background: linear-gradient(135deg, #2379e8, #1557bd);
          border: 0;
          border-radius: 10px;
          box-shadow: 0 5px 13px rgba(26, 98, 202, 0.2);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
        }

        .target-page .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
          box-shadow: 0 8px 18px rgba(26, 98, 202, 0.27);
        }

        .target-page .loading-state,
        .target-page .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 190px;
          padding: 25px;
          color: var(--muted, #7c8a9d);
          text-align: center;
        }

        .target-page .loading-state p,
        .target-page .empty-state p {
          margin: 12px 0 0;
          font-size: 12px;
          line-height: 1.6;
        }

        .target-page .empty-state h3 {
          margin: 12px 0 0;
          color: var(--text, #26374d);
          font-size: 15px;
        }

        .target-page .loading-spinner {
          width: 25px;
          height: 25px;
          border: 3px solid var(--border, #dce5f0);
          border-top-color: #2479e8;
          border-radius: 50%;
          animation: target-spin 0.7s linear infinite;
        }

        .target-page .spin {
          animation: target-spin 0.8s linear infinite;
        }

        @keyframes target-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1000px) {
          .target-page .summary-grid {
            gap: 12px;
          }

          .target-page .summary-card {
            padding: 17px;
          }

          .target-page .target-table th,
          .target-page .target-table td {
            padding-right: 16px;
            padding-left: 16px;
          }
        }

        @media (max-width: 700px) {
          .target-page {
            padding-bottom: 22px;
          }

          .target-page .page-header {
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 19px;
          }

          .target-page .page-heading {
            gap: 11px;
          }

          .target-page .heading-icon {
            flex-basis: 41px;
            width: 41px;
            height: 41px;
            border-radius: 12px;
          }

          .target-page .heading-icon :global(svg) {
            width: 21px;
            height: 21px;
          }

          .target-page .eyebrow {
            font-size: 9px;
            letter-spacing: 1px;
          }

          .target-page .page-title {
            font-size: 22px;
            letter-spacing: -0.5px;
          }

          .target-page .page-subtitle {
            margin-top: 6px;
            font-size: 11px;
            line-height: 1.65;
          }

          .target-page .refresh-btn {
            flex-shrink: 0;
            width: 38px;
            min-width: 38px;
            height: 38px;
            min-height: 38px;
            padding: 0;
          }

          .target-page .refresh-btn span {
            display: none;
          }

          .target-page .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
          }

          .target-page .summary-card {
            padding: 14px;
            border-radius: 13px;
          }

          .target-page .summary-card:last-child {
            grid-column: 1 / -1;
          }

          .target-page .summary-top {
            margin-bottom: 12px;
          }

          .target-page .summary-icon {
            width: 35px;
            height: 35px;
            border-radius: 10px;
          }

          .target-page .summary-icon :global(svg) {
            width: 18px;
            height: 18px;
          }

          .target-page .summary-tag {
            padding: 4px 6px;
            font-size: 8px;
          }

          .target-page .summary-label {
            margin-bottom: 6px;
            font-size: 10px;
          }

          .target-page .summary-value {
            font-size: clamp(22px, 6vw, 28px);
          }

          .target-page .money-value {
            font-size: clamp(18px, 4.7vw, 24px);
          }

          .target-page .summary-note {
            margin-top: 6px;
            font-size: 10px;
          }

          .target-page .target-panel {
            border-radius: 13px;
          }

          .target-page .panel-header {
            padding: 16px;
          }

          .target-page .panel-title-wrap {
            gap: 9px;
          }

          .target-page .panel-title-icon {
            flex-basis: 36px;
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }

          .target-page .panel-title-icon :global(svg) {
            width: 18px;
            height: 18px;
          }

          .target-page .panel-header h2 {
            font-size: 14px;
          }

          .target-page .panel-header p {
            max-width: 240px;
            font-size: 10px;
          }

          .target-page .product-count {
            padding: 6px 7px;
            font-size: 9px;
          }

          .target-page .month-filter {
            flex-wrap: wrap;
            gap: 10px;
            margin: 14px;
            padding: 12px;
          }

          .target-page .month-filter-icon {
            flex-basis: 35px;
            width: 35px;
            height: 35px;
          }

          .target-page .month-field {
            flex: 1;
            width: auto;
            min-width: 130px;
          }

          .target-page .month-description {
            width: 100%;
            margin-left: 45px;
            text-align: left;
          }

          .target-page .month-description strong {
            font-size: 11px;
          }

          .target-page .desktop-table-wrap {
            display: none;
          }

          .target-page .mobile-product-list {
            display: grid;
            gap: 10px;
            padding: 0 12px;
          }

          .target-page .mobile-product-card {
            min-width: 0;
            padding: 13px;
            background: var(--card, #fff);
            border: 1px solid var(--border, #e2e9f2);
            border-radius: 11px;
          }

          .target-page .mobile-product-heading {
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border, #edf0f5);
          }

          .target-page .mobile-product-heading .product-number {
            flex-basis: 33px;
            width: 33px;
            height: 33px;
          }

          .target-page .mobile-product-heading .product-name strong {
            font-size: 12px;
          }

          .target-page .mobile-input-grid {
            display: grid;
            grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
            gap: 10px;
            margin-top: 12px;
          }

          .target-page .field-group {
            display: flex;
            flex-direction: column;
            gap: 7px;
            min-width: 0;
          }

          .target-page .field-group label {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
          }

          .target-page .mobile-input {
            display: flex;
            align-items: center;
            min-width: 0;
            min-height: 38px;
            overflow: hidden;
            background: var(--card, #fff);
            border: 1px solid var(--border, #dfe7f0);
            border-radius: 8px;
          }

          .target-page .mobile-input input {
            width: 100%;
            min-width: 0;
            height: 36px;
            padding: 7px 8px;
            color: var(--text, #1c2e44);
            background: transparent;
            border: 0;
            outline: none;
            font: inherit;
            font-size: 12px;
            font-weight: 700;
          }

          .target-page .mobile-input input:focus {
            box-shadow: none;
          }

          .target-page .mobile-input > span:not(.mobile-rp) {
            padding-right: 8px;
            color: var(--muted, #8793a5);
            font-size: 9px;
          }

          .target-page .mobile-rp {
            padding-left: 8px;
            color: #16845b;
            font-size: 10px;
            font-weight: 800;
          }

          .target-page .total-strip {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            margin: 14px 12px 0;
            padding: 13px;
          }

          .target-page .total-strip-item {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .target-page .total-strip-item span {
            font-size: 10px;
          }

          .target-page .total-strip-item strong {
            font-size: 12px;
            text-align: right;
          }

          .target-page .feedback {
            margin: 14px 12px 0;
            padding: 10px;
            font-size: 11px;
          }

          .target-page .panel-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 13px;
            margin-top: 15px;
            padding: 14px 12px;
          }

          .target-page .footer-info {
            font-size: 10px;
          }

          .target-page .save-btn {
            width: 100%;
            min-height: 43px;
          }
        }

        @media (max-width: 360px) {
          .target-page .page-title {
            font-size: 19px;
          }

          .target-page .summary-card {
            padding: 11px;
          }

          .target-page .summary-value {
            font-size: 21px;
          }

          .target-page .money-value {
            font-size: 17px;
          }

          .target-page .mobile-input-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .target-page .product-count {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .target-page *,
          .target-page *::before,
          .target-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
