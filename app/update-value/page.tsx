
"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  Save,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  code: string;
};

type DailyProductValue = {
  product_id: string;
  value: number | string | null;
};

type HistoryRow = {
  product_id: string;
  entry_date: string;
  value: number | string | null;
};

type HistoryDay = {
  date: string;
  total: number;
  count: number;
  items: {
    product_id: string;
    value: number;
  }[];
};

const money = (value: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const numberFormat = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value || 0);

const parseValue = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? "" : String(Number(digits));
};

const formatInput = (value: string) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
};

const todayString = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (date: string) => {
  if (!date) return "—";

  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "id-ID",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

export default function UpdateValuePage() {
  const [supabase] = useState(() => createClient());

  const [products, setProducts] = useState<Product[]>([]);
  const [date, setDate] = useState(todayString());
  const [values, setValues] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryDay[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingValues, setLoadingValues] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [expandedDate, setExpandedDate] = useState("");

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error: productsError } = await supabase
        .from("products")
        .select("id,name,code")
        .eq("active", true)
        .order("name");

      if (productsError) throw productsError;

      setProducts((data ?? []) as Product[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data produk.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadValues = useCallback(async () => {
    setLoadingValues(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error: valuesError } = await supabase
        .from("daily_product_values")
        .select("product_id,value")
        .eq("user_id", authData.user.id)
        .eq("entry_date", date);

      if (valuesError) throw valuesError;

      const next: Record<string, string> = {};

      ((data ?? []) as DailyProductValue[]).forEach((row) => {
        next[row.product_id] =
          row.value === null || row.value === undefined
            ? ""
            : String(Number(row.value));
      });

      setValues(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat value pada tanggal tersebut.",
      );
    } finally {
      setLoadingValues(false);
    }
  }, [date, supabase]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        return;
      }

      const { data, error: historyError } = await supabase
        .from("daily_product_values")
        .select("product_id,entry_date,value")
        .eq("user_id", authData.user.id)
        .order("entry_date", { ascending: false })
        .limit(500);

      if (historyError) throw historyError;

      const grouped = new Map<string, HistoryDay>();

      ((data ?? []) as HistoryRow[]).forEach((row) => {
        const day = row.entry_date.slice(0, 10);
        const amount = Number(row.value) || 0;

        if (!grouped.has(day)) {
          grouped.set(day, {
            date: day,
            total: 0,
            count: 0,
            items: [],
          });
        }

        const group = grouped.get(day)!;
        group.total += amount;
        group.count += 1;
        group.items.push({
          product_id: row.product_id,
          value: amount,
        });
      });

      setHistory(
        Array.from(grouped.values()).sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat riwayat value.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadProducts();
    void loadHistory();
  }, [loadProducts, loadHistory]);

  useEffect(() => {
    void loadValues();
  }, [loadValues]);

  function handleValueChange(productId: string, input: string) {
    const parsed = parseValue(input);

    setValues((current) => ({
      ...current,
      [productId]: parsed,
    }));

    clearMessages();
  }

  async function save() {
    if (saving || loading || loadingValues) return;

    setSaving(true);
    clearMessages();

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setError("Sesi login berakhir. Silakan login kembali.");
        return;
      }

      if (!date) {
        setError("Silakan pilih tanggal pencatatan.");
        return;
      }

      if (products.length === 0) {
        setError("Tidak ada produk aktif untuk disimpan.");
        return;
      }

      const rows = products.map((product) => {
        const rawValue = values[product.id] ?? "";
        const numericValue =
          rawValue.trim() === "" ? 0 : Number(rawValue);

        if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
          throw new Error(
            `Value untuk ${product.name} tidak valid. Masukkan angka Rupiah bulat.`,
          );
        }

        return {
          user_id: authData.user.id,
          product_id: product.id,
          entry_date: date,
          value: numericValue,
        };
      });

      const { error: saveError } = await supabase
        .from("daily_product_values")
        .upsert(rows, {
          onConflict: "user_id,product_id,entry_date",
        });

      if (saveError) throw saveError;

      setMessage("Value harian berhasil disimpan.");
      await Promise.all([loadValues(), loadHistory()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan value harian.",
      );
    } finally {
      setSaving(false);
    }
  }

  const total = products.reduce((sum, product) => {
    return sum + Math.max(0, Number(values[product.id] || 0));
  }, 0);

  const productsWithValue = products.filter(
    (product) => Number(values[product.id] || 0) > 0,
  ).length;

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.code}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const filteredHistory = history.filter((day) => {
    const query = historySearch.trim().toLowerCase();

    if (!query) return true;

    return (
      day.date.includes(query) ||
      formatDate(day.date).toLowerCase().includes(query) ||
      day.items.some((item) => {
        const product = products.find(
          (candidate) => candidate.id === item.product_id,
        );

        return `${product?.name ?? ""} ${product?.code ?? ""}`
          .toLowerCase()
          .includes(query);
      })
    );
  });

  const latestHistory = history[0];
  const monthPrefix = date.slice(0, 7);
  const monthTotal = history
    .filter((day) => day.date.startsWith(monthPrefix))
    .reduce((sum, day) => sum + day.total, 0);

  return (
    <AppShell>
      <main className="value-page">
        <header className="value-header">
          <div className="value-heading">
            <div className="value-eyebrow">
              <Activity size={14} />
              SALES ACTIVITY
            </div>

            <h1>Update Value Produk</h1>
            <p>
              Catat nilai penjualan harian setiap produk dan pantau
              riwayat pencatatan dalam satu halaman.
            </p>
          </div>

          <button
            type="button"
            className="value-btn value-btn-outline"
            onClick={() => {
              clearMessages();
              void Promise.all([
                loadProducts(),
                loadValues(),
                loadHistory(),
              ]);
            }}
            disabled={loading || loadingValues || loadingHistory}
          >
            <RefreshCw
              size={16}
              className={
                loading || loadingValues || loadingHistory
                  ? "value-spin"
                  : ""
              }
            />
            Muat Ulang
          </button>
        </header>

        {message && (
          <div className="value-alert value-alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Tutup pesan"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="value-alert value-alert-error" role="alert">
            <X size={18} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Tutup pesan"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="value-stats">
          <article className="value-stat-card">
            <div className="value-stat-top">
              <span className="value-stat-icon blue">
                <Wallet size={20} />
              </span>
              <span className="value-stat-caption">TOTAL VALUE</span>
            </div>
            <p>Total Value Harian</p>
            <strong className="value-stat-number">{money(total)}</strong>
            <small>Akumulasi untuk tanggal terpilih</small>
          </article>

          <article className="value-stat-card">
            <div className="value-stat-top">
              <span className="value-stat-icon purple">
                <Database size={20} />
              </span>
              <span className="value-stat-caption">KATALOG</span>
            </div>
            <p>Produk Aktif</p>
            <strong className="value-stat-number">
              {numberFormat(products.length)}
            </strong>
            <small>
              {productsWithValue} produk memiliki value di atas Rp0
            </small>
          </article>

          <article className="value-stat-card">
            <div className="value-stat-top">
              <span className="value-stat-icon green">
                <TrendingUp size={20} />
              </span>
              <span className="value-stat-caption">BULAN INI</span>
            </div>
            <p>Total Value Bulanan</p>
            <strong className="value-stat-number">
              {money(monthTotal)}
            </strong>
            <small>
              Akumulasi riwayat bulan {formatDate(`${monthPrefix}-01`)}
            </small>
          </article>
        </section>

        <section className="value-panel">
          <div className="value-panel-header">
            <div className="value-panel-title">
              <span className="value-panel-icon blue">
                <Wallet size={20} />
              </span>
              <div>
                <h2>Input Value Harian</h2>
                <p>
                  Masukkan nilai penjualan per produk dalam Rupiah.
                </p>
              </div>
            </div>

            <span className="value-badge">IDR · RUPIAH</span>
          </div>

          <div className="value-date-field">
            <label htmlFor="value-date">Tanggal pencatatan</label>
            <div className="value-date-input">
              <CalendarDays size={17} />
              <input
                id="value-date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  clearMessages();
                }}
                disabled={saving}
              />
            </div>
            <small>
              Value yang tampil mengikuti tanggal yang dipilih.
            </small>
          </div>

          <div className="value-section-heading">
            <div>
              <h3>Nilai per Produk</h3>
              <p>
                Angka otomatis menggunakan pemisah ribuan Indonesia.
              </p>
            </div>
            <span className="value-count-badge">
              {products.length} produk
            </span>
          </div>

          <div className="value-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau kode produk..."
              aria-label="Cari produk"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Hapus pencarian"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="value-empty">Memuat daftar produk...</div>
          ) : loadingValues ? (
            <div className="value-empty">
              <RefreshCw size={18} className="value-spin" />
              Memuat value untuk tanggal terpilih...
            </div>
          ) : products.length === 0 ? (
            <div className="value-empty">
              Belum ada produk aktif. Periksa tabel products di Supabase.
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="value-empty">
              Produk yang dicari tidak ditemukan.
            </div>
          ) : (
            <div className="value-product-grid">
              {filteredProducts.map((product, index) => {
                const currentValue = Number(values[product.id] || 0);

                return (
                  <article
                    className="value-product-card"
                    key={product.id}
                  >
                    <div className="value-product-heading">
                      <span
                        className={`value-product-symbol symbol-${index % 5}`}
                      >
                        <Wallet size={19} />
                      </span>
                      <div className="value-product-name">
                        <label htmlFor={`value-${product.id}`}>
                          {product.name}
                        </label>
                        <span>{product.code}</span>
                      </div>
                      <span
                        className={`value-product-status ${
                          currentValue > 0 ? "has-value" : ""
                        }`}
                      >
                        {currentValue > 0 ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <Clock3 size={15} />
                        )}
                      </span>
                    </div>

                    <div className="value-input-wrap">
                      <span className="value-prefix">Rp</span>
                      <input
                        id={`value-${product.id}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={formatInput(values[product.id] ?? "")}
                        onChange={(event) =>
                          handleValueChange(
                            product.id,
                            event.target.value,
                          )
                        }
                        placeholder="0"
                        disabled={saving}
                        aria-label={`Value penjualan ${product.name} dalam Rupiah`}
                      />
                    </div>

                    <div className="value-product-preview">
                      <span>Value pencatatan</span>
                      <strong>{money(currentValue)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="value-total-strip">
            <div>
              <span>Total value pencatatan</span>
              <strong>{money(total)}</strong>
            </div>
            <span className="value-total-count">
              {productsWithValue} dari {products.length} produk bernilai
            </span>
          </div>

          <div className="value-form-footer">
            <p>
              <span className="value-required-dot" />
              Pastikan tanggal dan nominal sudah benar sebelum menyimpan.
            </p>

            <button
              type="button"
              className="value-btn value-btn-primary"
              onClick={() => void save()}
              disabled={saving || loading || loadingValues}
            >
              {saving ? (
                <RefreshCw size={17} className="value-spin" />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Menyimpan..." : "Simpan Update Harian"}
            </button>
          </div>
        </section>

        <section className="value-panel value-history-panel">
          <div className="value-panel-header">
            <div className="value-panel-title">
              <span className="value-panel-icon orange">
                <CalendarDays size={20} />
              </span>
              <div>
                <h2>Riwayat Value Harian</h2>
                <p>
                  Lihat tanggal pencatatan dan total value setiap hari.
                </p>
              </div>
            </div>

            <span className="value-badge">
              {history.length} hari
            </span>
          </div>

          <div className="value-history-toolbar">
            <div className="value-history-current-date">
              <CalendarDays size={18} />
              <div>
                <small>Tanggal yang sedang dipilih</small>
                <strong>{formatDate(date)}</strong>
              </div>
            </div>

            <div className="value-history-search">
              <Search size={16} />
              <input
                type="search"
                value={historySearch}
                onChange={(event) =>
                  setHistorySearch(event.target.value)
                }
                placeholder="Cari tanggal atau produk..."
                aria-label="Cari riwayat value"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch("")}
                  aria-label="Hapus pencarian riwayat"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {loadingHistory ? (
            <div className="value-empty">
              <RefreshCw size={18} className="value-spin" />
              Memuat riwayat...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="value-empty value-empty-large">
              <span className="value-history-empty-icon">
                <CalendarDays size={26} />
              </span>
              <strong>Belum ada riwayat value</strong>
              <p>
                Riwayat akan muncul setelah value harian disimpan.
              </p>
            </div>
          ) : (
            <div className="value-history-list">
              {filteredHistory.map((day) => {
                const isExpanded = expandedDate === day.date;

                return (
                  <article className="value-history-item" key={day.date}>
                    <button
                      type="button"
                      className="value-history-row"
                      onClick={() =>
                        setExpandedDate(isExpanded ? "" : day.date)
                      }
                      aria-expanded={isExpanded}
                    >
                      <span className="value-history-date-icon">
                        <CalendarDays size={18} />
                      </span>

                      <span className="value-history-date-text">
                        <strong>{formatDate(day.date)}</strong>
                        <small>
                          {day.count} produk tercatat
                          {day.date === todayString()
                            ? " · Hari ini"
                            : ""}
                        </small>
                      </span>

                      <span className="value-history-amount">
                        <strong>{money(day.total)}</strong>
                        <small>Total harian</small>
                      </span>

                      <span
                        className={`value-history-chevron ${
                          isExpanded ? "expanded" : ""
                        }`}
                      >
                        <span />
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="value-history-detail">
                        <div className="value-history-detail-heading">
                          <strong>Rincian value produk</strong>
                          <button
                            type="button"
                            className="value-history-use-date"
                            onClick={() => {
                              setDate(day.date);
                              clearMessages();
                              window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                              });
                            }}
                          >
                            Gunakan tanggal ini
                          </button>
                        </div>

                        {day.items
                          .slice()
                          .sort((a, b) => b.value - a.value)
                          .map((item) => {
                            const product = products.find(
                              (candidate) =>
                                candidate.id === item.product_id,
                            );

                            return (
                              <div
                                className="value-history-product-row"
                                key={item.product_id}
                              >
                                <span className="value-history-product-name">
                                  {product?.name ?? "Produk tidak aktif"}
                                </span>
                                <strong>{money(item.value)}</strong>
                              </div>
                            );
                          })}

                        <div className="value-history-detail-total">
                          <span>Total pada {formatDate(day.date)}</span>
                          <strong>{money(day.total)}</strong>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div className="value-history-footer">
            <span>
              Menampilkan <strong>{filteredHistory.length}</strong> hari
              pencatatan
            </span>
            <span>
              Riwayat dibatasi hingga <strong>500 catatan produk</strong>
              terbaru.
            </span>
          </div>
        </section>

        <style jsx global>{`
          .value-page {
            width: 100%;
            max-width: 1500px;
            min-width: 0;
            margin: 0 auto;
            padding: 26px;
            color: #172b4d;
            font-size: 13px;
          }

          .value-page *,
          .value-page *::before,
          .value-page *::after {
            box-sizing: border-box;
          }

          .value-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 24px;
          }

          .value-heading {
            min-width: 0;
          }

          .value-eyebrow {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 8px;
            color: #2874d0;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.3px;
          }

          .value-heading h1 {
            margin: 0;
            color: #142b4d;
            font-size: clamp(24px, 2.3vw, 31px);
            font-weight: 800;
            letter-spacing: -0.8px;
            line-height: 1.3;
          }

          .value-heading p {
            max-width: 650px;
            margin: 8px 0 0;
            color: #7b8ba2;
            font-size: 12px;
            line-height: 1.7;
          }

          .value-btn {
            display: inline-flex;
            min-height: 41px;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 15px;
            border: 1px solid transparent;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 750;
            cursor: pointer;
            transition:
              transform 0.18s ease,
              background 0.18s ease,
              box-shadow 0.18s ease;
          }

          .value-btn:hover:not(:disabled) {
            transform: translateY(-1px);
          }

          .value-btn:disabled {
            cursor: not-allowed;
            opacity: 0.55;
          }

          .value-btn-outline {
            border-color: #dce5f0;
            background: #fff;
            color: #36516f;
          }

          .value-btn-outline:hover:not(:disabled) {
            background: #f1f6ff;
          }

          .value-btn-primary {
            min-height: 44px;
            padding: 12px 19px;
            background: linear-gradient(135deg, #2877e8, #1756bf);
            box-shadow: 0 5px 14px rgb(37 99 235 / 20%);
            color: #fff;
          }

          .value-btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #1d67d3, #1248a8);
            box-shadow: 0 7px 17px rgb(37 99 235 / 26%);
          }

          .value-spin {
            animation: value-spin 0.8s linear infinite;
          }

          @keyframes value-spin {
            to {
              transform: rotate(360deg);
            }
          }

          .value-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 17px;
            padding: 12px 14px;
            border: 1px solid;
            border-radius: 11px;
            font-size: 12px;
            line-height: 1.5;
          }

          .value-alert > span {
            flex: 1;
            overflow-wrap: anywhere;
          }

          .value-alert > button {
            display: grid;
            width: 27px;
            height: 27px;
            flex-shrink: 0;
            place-items: center;
            border: 0;
            border-radius: 7px;
            background: transparent;
            cursor: pointer;
          }

          .value-alert-success {
            border-color: #bcebd4;
            background: #effcf5;
            color: #08784e;
          }

          .value-alert-error {
            border-color: #fecaca;
            background: #fff1f2;
            color: #b42332;
          }

          .value-alert-success > button {
            color: #08784e;
          }

          .value-alert-error > button {
            color: #b42332;
          }

          .value-stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 15px;
            margin-bottom: 21px;
          }

          .value-stat-card {
            min-width: 0;
            padding: 19px;
            border: 1px solid #e4ebf5;
            border-radius: 15px;
            background: #fff;
            box-shadow: 0 4px 18px rgb(30 64 120 / 4%);
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .value-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 23px rgb(30 64 120 / 8%);
          }

          .value-stat-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 15px;
          }

          .value-stat-icon {
            display: grid;
            width: 41px;
            height: 41px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 12px;
          }

          .value-stat-icon.blue {
            background: #e9f2ff;
            color: #286be1;
          }

          .value-stat-icon.purple {
            background: #f0eaff;
            color: #7653d5;
          }

          .value-stat-icon.green {
            background: #e5f8ee;
            color: #16835a;
          }

          .value-stat-caption {
            color: #8491a5;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.7px;
          }

          .value-stat-card > p {
            margin: 0 0 8px;
            color: #6f8097;
            font-size: 12px;
            font-weight: 650;
          }

          .value-stat-number {
            display: block;
            color: #172d4f;
            font-size: clamp(20px, 2vw, 27px);
            font-weight: 800;
            letter-spacing: -0.6px;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }

          .value-stat-card > small {
            display: block;
            margin-top: 7px;
            color: #8a98ab;
            font-size: 10px;
            line-height: 1.6;
          }

          .value-panel {
            min-width: 0;
            margin-bottom: 21px;
            padding: 23px;
            border: 1px solid #e4ebf5;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 4px 20px rgb(30 64 120 / 4%);
          }

          .value-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 22px;
          }

          .value-panel-title {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 12px;
          }

          .value-panel-icon {
            display: grid;
            width: 42px;
            height: 42px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 12px;
          }

          .value-panel-icon.blue {
            background: #eaf2ff;
            color: #286be1;
          }

          .value-panel-icon.orange {
            background: #fff2e6;
            color: #d77922;
          }

          .value-panel-title h2 {
            margin: 0;
            color: #172d4f;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: -0.3px;
          }

          .value-panel-title p {
            margin: 5px 0 0;
            color: #8290a5;
            font-size: 11px;
            line-height: 1.6;
          }

          .value-badge {
            flex-shrink: 0;
            padding: 7px 10px;
            border: 1px solid #dce7f5;
            border-radius: 8px;
            background: #f6f9ff;
            color: #617795;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.45px;
          }

          .value-date-field {
            max-width: 360px;
          }

          .value-date-field label {
            display: block;
            margin-bottom: 8px;
            color: #344965;
            font-size: 11px;
            font-weight: 750;
          }

          .value-date-input {
            display: flex;
            height: 43px;
            align-items: center;
            gap: 10px;
            padding: 0 12px;
            border: 1px solid #dce5f0;
            border-radius: 9px;
            background: #fff;
            color: #6f86a2;
            transition:
              border-color 0.18s ease,
              box-shadow 0.18s ease;
          }

          .value-date-input:focus-within {
            border-color: #4c8dea;
            box-shadow: 0 0 0 3px rgb(61 130 230 / 12%);
          }

          .value-date-input svg {
            flex-shrink: 0;
          }

          .value-date-input input {
            width: 100%;
            min-width: 0;
            height: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #263f60;
            font: inherit;
            font-size: 12px;
          }

          .value-date-field > small {
            display: block;
            margin-top: 7px;
            color: #8a98ab;
            font-size: 10px;
          }

          .value-section-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 27px 0 14px;
            padding-bottom: 13px;
            border-bottom: 1px solid #edf1f7;
          }

          .value-section-heading h3 {
            margin: 0;
            color: #213956;
            font-size: 13px;
            font-weight: 800;
          }

          .value-section-heading p {
            margin: 5px 0 0;
            color: #8996a8;
            font-size: 10px;
            line-height: 1.6;
          }

          .value-count-badge {
            flex-shrink: 0;
            padding: 6px 9px;
            border-radius: 7px;
            background: #edf4ff;
            color: #2868c8;
            font-size: 10px;
            font-weight: 800;
          }

          .value-search,
          .value-history-search {
            display: flex;
            min-width: 0;
            height: 40px;
            align-items: center;
            gap: 9px;
            padding: 0 11px;
            border: 1px solid #e0e8f2;
            border-radius: 9px;
            background: #fafcff;
            color: #8193aa;
          }

          .value-search {
            max-width: 430px;
            margin-bottom: 15px;
          }

          .value-search:focus-within,
          .value-history-search:focus-within {
            border-color: #6b9ee9;
            box-shadow: 0 0 0 3px rgb(61 130 230 / 9%);
          }

          .value-search > svg,
          .value-history-search > svg {
            flex-shrink: 0;
          }

          .value-search input,
          .value-history-search input {
            width: 100%;
            min-width: 0;
            height: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #263f60;
            font: inherit;
            font-size: 11px;
          }

          .value-search input::placeholder,
          .value-history-search input::placeholder {
            color: #9aa8b9;
          }

          .value-search > button,
          .value-history-search > button {
            display: grid;
            width: 25px;
            height: 25px;
            flex-shrink: 0;
            place-items: center;
            border: 0;
            border-radius: 6px;
            background: #edf2f8;
            color: #718198;
            cursor: pointer;
          }

          .value-product-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 13px;
          }

          .value-product-card {
            min-width: 0;
            padding: 15px;
            border: 1px solid #e3eaf4;
            border-radius: 12px;
            background: #fff;
            transition:
              border-color 0.18s ease,
              box-shadow 0.18s ease,
              transform 0.18s ease;
          }

          .value-product-card:hover {
            transform: translateY(-1px);
            border-color: #c4d7f3;
            box-shadow: 0 5px 15px rgb(30 64 120 / 5%);
          }

          .value-product-card:focus-within {
            border-color: #4d8be7;
            box-shadow: 0 0 0 3px rgb(37 99 235 / 9%);
          }

          .value-product-heading {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
          }

          .value-product-symbol {
            display: grid;
            width: 38px;
            height: 38px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 10px;
            background: #eaf2ff;
            color: #286be1;
          }

          .value-product-symbol.symbol-1 {
            background: #e8f8f0;
            color: #16835a;
          }

          .value-product-symbol.symbol-2 {
            background: #f0eaff;
            color: #7958ce;
          }

          .value-product-symbol.symbol-3 {
            background: #fff2e4;
            color: #c97825;
          }

          .value-product-symbol.symbol-4 {
            background: #e5f6f8;
            color: #17808d;
          }

          .value-product-name {
            display: flex;
            min-width: 0;
            flex: 1;
            flex-direction: column;
            gap: 4px;
          }

          .value-product-name label {
            color: #273e5d;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.5;
            overflow-wrap: anywhere;
            cursor: text;
          }

          .value-product-name span {
            color: #8a98ab;
            font-size: 10px;
          }

          .value-product-status {
            display: grid;
            width: 27px;
            height: 27px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 8px;
            background: #f0f4f9;
            color: #a0adbd;
          }

          .value-product-status.has-value {
            background: #e5f8ee;
            color: #16835a;
          }

          .value-input-wrap {
            display: flex;
            min-width: 0;
            height: 45px;
            align-items: center;
            overflow: hidden;
            border: 1px solid #dce5f0;
            border-radius: 9px;
            background: #fbfcff;
            transition: border-color 0.18s ease;
          }

          .value-input-wrap:focus-within {
            border-color: #4c8dea;
          }

          .value-prefix {
            flex-shrink: 0;
            padding-left: 12px;
            color: #617895;
            font-size: 12px;
            font-weight: 750;
          }

          .value-input-wrap input {
            width: 100%;
            min-width: 0;
            height: 100%;
            padding: 0 12px 0 8px;
            border: 0;
            outline: 0;
            background: transparent;
            color: #203b60;
            font: inherit;
            font-size: 15px;
            font-weight: 800;
            text-align: right;
          }

          .value-input-wrap input::placeholder {
            color: #b0bbc9;
          }

          .value-input-wrap input:disabled {
            opacity: 0.6;
          }

          .value-product-preview {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-top: 12px;
          }

          .value-product-preview span {
            color: #8a98ab;
            font-size: 10px;
          }

          .value-product-preview strong {
            color: #2c4668;
            font-size: 11px;
            text-align: right;
            overflow-wrap: anywhere;
          }

          .value-total-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-top: 20px;
            padding: 17px;
            border: 1px solid #dce8fb;
            border-radius: 12px;
            background: linear-gradient(110deg, #f1f6ff, #f8fbff);
          }

          .value-total-strip > div {
            display: flex;
            min-width: 0;
            flex-direction: column;
            gap: 6px;
          }

          .value-total-strip > div > span {
            color: #6f83a0;
            font-size: 10px;
          }

          .value-total-strip > div > strong {
            color: #205db4;
            font-size: clamp(17px, 2vw, 23px);
            font-weight: 850;
            overflow-wrap: anywhere;
          }

          .value-total-count {
            color: #6681a6;
            font-size: 10px;
            text-align: right;
          }

          .value-form-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-top: 21px;
            padding-top: 18px;
            border-top: 1px solid #edf1f7;
          }

          .value-form-footer p {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin: 0;
            color: #8996a8;
            font-size: 10px;
            line-height: 1.7;
          }

          .value-required-dot {
            width: 7px;
            height: 7px;
            flex-shrink: 0;
            margin-top: 4px;
            border-radius: 50%;
            background: #3478e5;
          }

          .value-empty {
            display: flex;
            min-height: 95px;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 22px;
            border: 1px dashed #dce5f0;
            border-radius: 11px;
            background: #fafcff;
            color: #8290a5;
            font-size: 12px;
            text-align: center;
          }

          .value-empty-large {
            min-height: 180px;
            flex-direction: column;
          }

          .value-history-empty-icon {
            display: grid;
            width: 48px;
            height: 48px;
            place-items: center;
            border-radius: 14px;
            background: #edf4ff;
            color: #4b7fca;
          }

          .value-empty-large strong {
            color: #344965;
            font-size: 13px;
          }

          .value-empty-large p {
            margin: 0;
            color: #8a98ab;
            font-size: 11px;
            line-height: 1.6;
          }

          .value-history-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 17px;
            padding: 13px;
            border: 1px solid #e8eef6;
            border-radius: 11px;
            background: #f8faff;
          }

          .value-history-current-date {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 10px;
            color: #3274cf;
          }

          .value-history-current-date > svg {
            flex-shrink: 0;
          }

          .value-history-current-date > div {
            display: flex;
            min-width: 0;
            flex-direction: column;
            gap: 4px;
          }

          .value-history-current-date small {
            color: #8795a8;
            font-size: 10px;
          }

          .value-history-current-date strong {
            color: #263f60;
            font-size: 12px;
          }

          .value-history-search {
            width: min(330px, 100%);
            height: 38px;
            background: #fff;
          }

          .value-history-list {
            display: flex;
            flex-direction: column;
            gap: 9px;
          }

          .value-history-item {
            overflow: hidden;
            border: 1px solid #e4ebf5;
            border-radius: 11px;
            background: #fff;
            transition: border-color 0.18s ease;
          }

          .value-history-item:hover {
            border-color: #cadbf3;
          }

          .value-history-row {
            display: flex;
            width: 100%;
            min-width: 0;
            align-items: center;
            gap: 13px;
            padding: 14px;
            border: 0;
            background: transparent;
            text-align: left;
            cursor: pointer;
          }

          .value-history-date-icon {
            display: grid;
            width: 39px;
            height: 39px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 11px;
            background: #edf4ff;
            color: #3576cf;
          }

          .value-history-date-text {
            display: flex;
            min-width: 0;
            flex: 1;
            flex-direction: column;
            gap: 5px;
          }

          .value-history-date-text strong {
            color: #273e5d;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.5;
          }

          .value-history-date-text small {
            color: #8996a8;
            font-size: 10px;
          }

          .value-history-amount {
            display: flex;
            min-width: 0;
            flex-direction: column;
            align-items: flex-end;
            gap: 5px;
          }

          .value-history-amount strong {
            color: #1763bd;
            font-size: 13px;
            font-weight: 850;
            overflow-wrap: anywhere;
            text-align: right;
          }

          .value-history-amount small {
            color: #8996a8;
            font-size: 10px;
          }

          .value-history-chevron {
            display: grid;
            width: 25px;
            height: 25px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 7px;
            background: #f0f4f9;
          }

          .value-history-chevron span {
            width: 7px;
            height: 7px;
            border-right: 1.5px solid #73849b;
            border-bottom: 1.5px solid #73849b;
            transform: rotate(45deg) translate(-1px, -1px);
            transition: transform 0.18s ease;
          }

          .value-history-chevron.expanded span {
            transform: rotate(225deg) translate(-1px, -1px);
          }

          .value-history-detail {
            padding: 0 14px 14px;
            border-top: 1px solid #edf1f7;
            background: #fbfcff;
          }

          .value-history-detail-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 13px 0 10px;
          }

          .value-history-detail-heading > strong {
            color: #526782;
            font-size: 11px;
          }

          .value-history-use-date {
            padding: 7px 10px;
            border: 1px solid #cbdcf7;
            border-radius: 7px;
            background: #edf4ff;
            color: #2868c8;
            font-size: 10px;
            font-weight: 750;
            cursor: pointer;
          }

          .value-history-use-date:hover {
            background: #dfeeff;
          }

          .value-history-product-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 10px 0;
            border-bottom: 1px solid #edf1f7;
          }

          .value-history-product-name {
            color: #62758d;
            font-size: 11px;
            overflow-wrap: anywhere;
          }

          .value-history-product-row strong {
            color: #2d4565;
            font-size: 11px;
            text-align: right;
            overflow-wrap: anywhere;
          }

          .value-history-detail-total {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 12px;
            padding: 12px;
            border-radius: 9px;
            background: #edf4ff;
          }

          .value-history-detail-total span {
            color: #617895;
            font-size: 10px;
          }

          .value-history-detail-total strong {
            color: #205db4;
            font-size: 13px;
            overflow-wrap: anywhere;
            text-align: right;
          }

          .value-history-footer {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-top: 15px;
            color: #8996a8;
            font-size: 10px;
            line-height: 1.6;
          }

          .value-history-footer strong {
            color: #526782;
          }

          @media (max-width: 1050px) {
            .value-page {
              padding: 22px;
            }

            .value-stats {
              gap: 11px;
            }

            .value-stat-card {
              padding: 16px;
            }
          }

          @media (max-width: 700px) {
            .value-page {
              padding: 16px 12px 26px;
            }

            .value-header {
              align-items: flex-start;
              gap: 10px;
              margin-bottom: 18px;
            }

            .value-heading h1 {
              font-size: 23px;
              letter-spacing: -0.6px;
            }

            .value-heading p {
              font-size: 11px;
            }

            .value-header > .value-btn {
              min-height: 35px;
              gap: 6px;
              padding: 8px 9px;
              font-size: 10px;
            }

            .value-header > .value-btn svg {
              width: 14px;
              height: 14px;
            }

            .value-stats {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 15px;
            }

            .value-stat-card {
              padding: 13px;
              border-radius: 12px;
            }

            .value-stat-card:last-child {
              grid-column: 1 / -1;
            }

            .value-stat-icon {
              width: 34px;
              height: 34px;
              border-radius: 10px;
            }

            .value-stat-caption {
              font-size: 8px;
              letter-spacing: 0.3px;
            }

            .value-stat-card > p {
              font-size: 10px;
            }

            .value-stat-number {
              font-size: 21px;
            }

            .value-stat-card > small {
              font-size: 9px;
            }

            .value-panel {
              margin-bottom: 15px;
              padding: 16px 13px;
              border-radius: 13px;
            }

            .value-panel-header {
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 18px;
            }

            .value-panel-title {
              gap: 9px;
            }

            .value-panel-icon {
              width: 36px;
              height: 36px;
              border-radius: 10px;
            }

            .value-panel-title h2 {
              font-size: 14px;
            }

            .value-panel-title p {
              font-size: 10px;
            }

            .value-badge {
              padding: 6px 7px;
              font-size: 8px;
            }

            .value-date-field {
              max-width: none;
            }

            .value-section-heading {
              margin-top: 23px;
            }

            .value-section-heading h3 {
              font-size: 12px;
            }

            .value-section-heading p {
              font-size: 9px;
            }

            .value-product-grid {
              grid-template-columns: minmax(0, 1fr);
              gap: 9px;
            }

            .value-product-card {
              padding: 12px;
            }

            .value-product-heading {
              margin-bottom: 12px;
            }

            .value-product-name label {
              font-size: 11px;
            }

            .value-input-wrap {
              height: 43px;
            }

            .value-input-wrap input {
              font-size: 14px;
            }

            .value-total-strip {
              align-items: flex-start;
              flex-direction: column;
              gap: 9px;
              padding: 14px;
            }

            .value-total-count {
              text-align: left;
            }

            .value-form-footer {
              align-items: stretch;
              flex-direction: column;
              gap: 13px;
              margin-top: 17px;
              padding-top: 15px;
            }

            .value-form-footer p {
              font-size: 10px;
            }

            .value-form-footer .value-btn {
              width: 100%;
            }

            .value-history-toolbar {
              align-items: stretch;
              flex-direction: column;
              gap: 12px;
              padding: 11px;
            }

            .value-history-search {
              width: 100%;
            }

            .value-history-row {
              gap: 9px;
              padding: 11px 9px;
            }

            .value-history-date-icon {
              width: 33px;
              height: 33px;
              border-radius: 9px;
            }

            .value-history-date-icon svg {
              width: 16px;
              height: 16px;
            }

            .value-history-date-text strong {
              font-size: 10px;
            }

            .value-history-date-text small {
              font-size: 9px;
              line-height: 1.5;
            }

            .value-history-amount {
              max-width: 125px;
            }

            .value-history-amount strong {
              font-size: 10px;
            }

            .value-history-amount small {
              font-size: 9px;
            }

            .value-history-chevron {
              width: 22px;
              height: 22px;
            }

            .value-history-detail {
              padding: 0 10px 11px;
            }

            .value-history-detail-heading {
              align-items: flex-start;
              flex-direction: column;
              gap: 8px;
            }

            .value-history-footer {
              flex-direction: column;
              gap: 5px;
            }

            .value-alert {
              align-items: flex-start;
              padding: 11px;
              font-size: 11px;
            }
          }

          @media (max-width: 380px) {
            .value-page {
              padding-right: 9px;
              padding-left: 9px;
            }

            .value-heading h1 {
              font-size: 20px;
            }

            .value-header > .value-btn {
              padding: 8px 7px;
            }

            .value-stat-card {
              padding: 11px;
            }

            .value-stat-number {
              font-size: 18px;
            }

            .value-history-row {
              gap: 7px;
            }

            .value-history-amount {
              max-width: 105px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .value-page *,
            .value-page *::before,
            .value-page *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </main>
    </AppShell>
  );
}
