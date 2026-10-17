
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  code: string;
};

type Outlet = {
  id: string;
  name: string;
  area: string | null;
};

type Entry = {
  outlet_id: string;
  product_id: string;
  notes: string | null;
  transaction_date: string;
};

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "id-ID",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

export default function UpdateOutletPage() {
  const [supabase] = useState(() => createClient());

  const [products, setProducts] = useState<Product[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const [newOutlet, setNewOutlet] = useState("");
  const [newArea, setNewArea] = useState("");
  const [date, setDate] = useState(todayString());
  const [outletSearch, setOutletSearch] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [filterOutlet, setFilterOutlet] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingOutlet, setAddingOutlet] = useState(false);
  const [deletingKey, setDeletingKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const loadAll = useCallback(async () => {
    setLoading(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        window.location.href = "/login";
        return;
      }

      const [p, o, tx] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,code")
          .eq("active", true)
          .order("name"),

        supabase
          .from("outlets")
          .select("id,name,area")
          .eq("user_id", auth.user.id)
          .order("name"),

        supabase
          .from("daily_outlet_transactions")
          .select(
            "outlet_id,product_id,notes,transaction_date",
          )
          .eq("user_id", auth.user.id)
          .eq("transaction_date", date)
          .order("transaction_date", { ascending: false }),
      ]);

      if (p.error) throw p.error;
      if (o.error) throw o.error;
      if (tx.error) throw tx.error;

      const productData = (p.data ?? []) as Product[];
      const outletData = (o.data ?? []) as Outlet[];

      setProducts(productData);
      setOutlets(outletData);
      setEntries((tx.data ?? []) as Entry[]);

      setSelectedProducts((current) =>
        current.filter((id) =>
          productData.some((product) => product.id === id),
        ),
      );

      setSelectedOutlet((current) =>
        outletData.some((outlet) => outlet.id === current)
          ? current
          : "",
      );

      setFilterOutlet((current) =>
        current && !outletData.some((outlet) => outlet.id === current)
          ? ""
          : current,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data outlet.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, date]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredOutlets = outlets.filter((outlet) =>
    `${outlet.name} ${outlet.area ?? ""}`
      .toLowerCase()
      .includes(outletSearch.trim().toLowerCase()),
  );

  const filteredEntries = entries.filter(
    (entry) => !filterOutlet || entry.outlet_id === filterOutlet,
  );

  const allProductsSelected =
    products.length > 0 &&
    selectedProducts.length === products.length;

  const uniqueTransactionOutlets = new Set(
    entries.map((entry) => entry.outlet_id),
  ).size;

  async function addOutlet() {
    clearMessages();

    const name = newOutlet.trim();
    const area = newArea.trim();

    if (!name) {
      setError("Nama outlet wajib diisi.");
      return;
    }

    setAddingOutlet(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        setError("Sesi login berakhir. Silakan login kembali.");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("outlets")
        .insert({
          user_id: auth.user.id,
          name,
          area: area || null,
        })
        .select("id,name,area")
        .single();

      if (insertError) throw insertError;

      setNewOutlet("");
      setNewArea("");
      setSelectedOutlet(data.id);
      setOutletSearch(data.name);
      setMessage("Outlet berhasil ditambahkan.");

      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menambahkan outlet.",
      );
    } finally {
      setAddingOutlet(false);
    }
  }

  async function addTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();

    if (!selectedOutlet) {
      setError("Cari dan pilih outlet terlebih dahulu.");
      return;
    }

    if (!selectedProducts.length) {
      setError("Pilih minimal satu produk.");
      return;
    }

    setSaving(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        setError("Sesi login berakhir. Silakan login kembali.");
        return;
      }

      const rows = selectedProducts.map((productId) => ({
        user_id: auth.user.id,
        outlet_id: selectedOutlet,
        product_id: productId,
        transaction_date: date,
        notes: notes.trim() || null,
      }));

      const { error: saveError } = await supabase
        .from("daily_outlet_transactions")
        .upsert(rows, {
          onConflict:
            "user_id,outlet_id,product_id,transaction_date",
        });

      if (saveError) throw saveError;

      const count = selectedProducts.length;

      setSelectedProducts([]);
      setNotes("");
      setMessage(
        `${count} produk berhasil dicatat untuk outlet terpilih.`,
      );

      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan transaksi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entry: Entry) {
    clearMessages();

    const key = `${entry.outlet_id}-${entry.product_id}`;
    const confirmed = window.confirm(
      `Hapus transaksi ${products.find((p) => p.id === entry.product_id)?.name ?? "produk"} dari outlet ${outlets.find((o) => o.id === entry.outlet_id)?.name ?? ""} pada ${formatDate(entry.transaction_date)}?`,
    );

    if (!confirmed) return;

    setDeletingKey(key);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        setError("Silakan login kembali.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("daily_outlet_transactions")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("outlet_id", entry.outlet_id)
        .eq("product_id", entry.product_id)
        .eq("transaction_date", entry.transaction_date);

      if (deleteError) throw deleteError;

      setMessage("Catatan transaksi berhasil dihapus.");
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus transaksi.",
      );
    } finally {
      setDeletingKey("");
    }
  }

  return (
    <AppShell>
      <main className="uo-page">
        <header className="uo-header">
          <div className="uo-heading">
            <div className="uo-eyebrow">
              <Activity size={14} />
              SALES ACTIVITY
            </div>

            <h1>Update Harian</h1>
            <p>
              Catat transaksi outlet dan pantau aktivitas penjualan
              harian dalam satu tempat.
            </p>
          </div>

          <button
            type="button"
            className="uo-btn uo-btn-outline"
            onClick={() => void loadAll()}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "uo-spin" : ""}
            />
            <span>{loading ? "Memuat..." : "Muat Ulang"}</span>
          </button>
        </header>

        {error && (
          <div className="uo-alert uo-alert-error" role="alert">
            <X size={18} />
            <span>{error}</span>
            <button
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {message && (
          <div className="uo-alert uo-alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>{message}</span>
            <button
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setMessage("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="uo-stats">
          <article className="uo-stat">
            <div className="uo-stat-top">
              <span className="uo-stat-icon blue">
                <Users size={20} />
              </span>
              <span className="uo-stat-caption">OUTLET AKTIF</span>
            </div>
            <div className="uo-stat-value">{uniqueTransactionOutlets}</div>
            <p>Outlet unik yang bertransaksi</p>
          </article>

          <article className="uo-stat">
            <div className="uo-stat-top">
              <span className="uo-stat-icon purple">
                <ShoppingBag size={20} />
              </span>
              <span className="uo-stat-caption">TRANSAKSI PRODUK</span>
            </div>
            <div className="uo-stat-value">{entries.length}</div>
            <p>Catatan produk pada tanggal terpilih</p>
          </article>

          <article className="uo-stat">
            <div className="uo-stat-top">
              <span className="uo-stat-icon green">
                <CalendarDays size={20} />
              </span>
              <span className="uo-stat-caption">TANGGAL AKTIF</span>
            </div>
            <div className="uo-stat-date">{formatDate(date)}</div>
            <p>Tanggal pencatatan transaksi</p>
          </article>
        </section>

        <section className="uo-panel">
          <div className="uo-panel-header">
            <div className="uo-panel-title">
              <span className="uo-title-icon">
                <ClipboardList size={20} />
              </span>
              <div>
                <h2>Catat Transaksi</h2>
                <p>
                  Pilih tanggal, outlet, dan semua produk yang
                  ditransaksikan.
                </p>
              </div>
            </div>
            <span className="uo-step">01 / INPUT</span>
          </div>

          <form onSubmit={addTransaction}>
            <div className="uo-form-grid">
              <div className="uo-field">
                <label htmlFor="transaction-date">
                  Tanggal transaksi
                </label>
                <div className="uo-input-wrap">
                  <CalendarDays size={17} />
                  <input
                    id="transaction-date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      clearMessages();
                    }}
                    required
                  />
                </div>
                <small>Gunakan tanggal aktivitas sebenarnya.</small>
              </div>

              <div className="uo-field">
                <label htmlFor="outlet-search">Cari outlet</label>
                <div className="uo-input-wrap">
                  <Search size={17} />
                  <input
                    id="outlet-search"
                    type="search"
                    value={outletSearch}
                    onChange={(e) => {
                      setOutletSearch(e.target.value);
                      setSelectedOutlet("");
                      clearMessages();
                    }}
                    placeholder="Nama outlet atau area..."
                    autoComplete="off"
                  />
                </div>

                <div className="uo-select-wrap">
                  <select
                    id="outlet-select"
                    value={selectedOutlet}
                    onChange={(e) => {
                      setSelectedOutlet(e.target.value);
                      clearMessages();
                    }}
                    required
                  >
                    <option value="">
                      Pilih outlet ({filteredOutlets.length} ditemukan)
                    </option>
                    {filteredOutlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                        {outlet.area ? ` — ${outlet.area}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>

                {filteredOutlets.length === 0 && (
                  <small className="uo-help-error">
                    Outlet tidak ditemukan. Coba kata kunci lain.
                  </small>
                )}
              </div>

              <div className="uo-field">
                <label htmlFor="transaction-notes">
                  Keterangan <span>(opsional)</span>
                </label>
                <input
                  className="uo-input"
                  id="transaction-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: order rutin, repeat order..."
                />
                <small>Tambahkan catatan jika diperlukan.</small>
              </div>
            </div>

            <div className="uo-product-section">
              <div className="uo-product-heading">
                <div>
                  <h3>Produk transaksi</h3>
                  <p>
                    Centang produk yang benar-benar ditransaksikan
                    di outlet terpilih.
                  </p>
                </div>

                <button
                  type="button"
                  className="uo-btn uo-btn-light"
                  disabled={!products.length}
                  onClick={() =>
                    setSelectedProducts(
                      allProductsSelected
                        ? []
                        : products.map((product) => product.id),
                    )
                  }
                >
                  {allProductsSelected ? (
                    <X size={15} />
                  ) : (
                    <Check size={15} />
                  )}
                  {allProductsSelected
                    ? "Batalkan Semua"
                    : "Pilih Semua"}
                </button>
              </div>

              {loading ? (
                <div className="uo-empty">Memuat produk...</div>
              ) : products.length === 0 ? (
                <div className="uo-empty">
                  Belum ada produk aktif di database.
                </div>
              ) : (
                <div className="uo-products">
                  {products.map((product, index) => {
                    const checked = selectedProducts.includes(product.id);

                    return (
                      <label
                        key={product.id}
                        className={`uo-product ${checked ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedProducts((current) =>
                              e.target.checked
                                ? current.includes(product.id)
                                  ? current
                                  : [...current, product.id]
                                : current.filter(
                                    (id) => id !== product.id,
                                  ),
                            );
                            clearMessages();
                          }}
                        />
                        <span
                          className={`uo-product-mark mark-${index % 5}`}
                        >
                          {checked ? (
                            <Check size={18} />
                          ) : (
                            <ShoppingBag size={18} />
                          )}
                        </span>
                        <span className="uo-product-name">
                          {product.name}
                        </span>
                        <span className="uo-checkbox">
                          {checked && <Check size={13} />}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="uo-selection-footer">
                <span>
                  <CheckCircle2 size={16} />
                  <strong>{selectedProducts.length}</strong> dari{" "}
                  {products.length} produk dipilih
                </span>
                {selectedProducts.length > 0 && (
                  <button
                    type="button"
                    className="uo-text-button"
                    onClick={() => setSelectedProducts([])}
                  >
                    Reset pilihan
                  </button>
                )}
              </div>
            </div>

            <div className="uo-form-footer">
              <p>
                <span className="uo-required-dot" />
                Data transaksi tersimpan sesuai tanggal dan outlet.
              </p>
              <button
                className="uo-btn uo-btn-primary"
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  !selectedOutlet ||
                  selectedProducts.length === 0
                }
              >
                {saving ? (
                  <RefreshCw size={17} className="uo-spin" />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                {saving
                  ? "Menyimpan..."
                  : `Simpan ${selectedProducts.length || ""} Produk`}
              </button>
            </div>
          </form>
        </section>

        <section className="uo-panel">
          <div className="uo-panel-header">
            <div className="uo-panel-title">
              <span className="uo-title-icon green">
                <Plus size={20} />
              </span>
              <div>
                <h2>Tambah Outlet Baru</h2>
                <p>
                  Daftarkan outlet baru agar tersedia di pilihan
                  transaksi berikutnya.
                </p>
              </div>
            </div>
            <span className="uo-step">02 / OUTLET</span>
          </div>

          <div className="uo-form-grid uo-new-outlet-grid">
            <div className="uo-field">
              <label htmlFor="new-outlet">Nama outlet</label>
              <input
                className="uo-input"
                id="new-outlet"
                value={newOutlet}
                onChange={(e) => setNewOutlet(e.target.value)}
                placeholder="Masukkan nama outlet"
              />
            </div>

            <div className="uo-field">
              <label htmlFor="new-area">Area / jadwal kunjungan</label>
              <div className="uo-input-wrap">
                <MapPin size={17} />
                <input
                  id="new-area"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Contoh: Maharani, Senin ganjil"
                />
              </div>
            </div>

            <div className="uo-new-outlet-action">
              <button
                type="button"
                className="uo-btn uo-btn-green"
                onClick={() => void addOutlet()}
                disabled={addingOutlet || loading}
              >
                <Plus size={17} />
                {addingOutlet ? "Menambahkan..." : "Tambah Outlet"}
              </button>
            </div>
          </div>
        </section>

        <section className="uo-panel uo-history-panel">
          <div className="uo-panel-header">
            <div className="uo-panel-title">
              <span className="uo-title-icon orange">
                <ClipboardList size={20} />
              </span>
              <div>
                <h2>Riwayat Transaksi</h2>
                <p>
                  Daftar transaksi berdasarkan tanggal yang dipilih.
                </p>
              </div>
            </div>
            <span className="uo-history-count">
              {filteredEntries.length} catatan
            </span>
          </div>

          <div className="uo-history-toolbar">
            <div className="uo-history-date">
              <CalendarDays size={17} />
              <div>
                <small>Tanggal riwayat</small>
                <strong>{formatDate(date)}</strong>
              </div>
            </div>

            <div className="uo-field uo-filter-field">
              <label htmlFor="filter-outlet">Filter outlet</label>
              <div className="uo-select-wrap">
                <select
                  id="filter-outlet"
                  value={filterOutlet}
                  onChange={(e) => setFilterOutlet(e.target.value)}
                >
                  <option value="">Semua outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="uo-empty">Memuat riwayat transaksi...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="uo-empty uo-empty-large">
              <span className="uo-empty-icon">
                <ClipboardList size={26} />
              </span>
              <strong>Belum ada transaksi</strong>
              <p>
                Tidak ada transaksi untuk tanggal dan filter outlet ini.
                Coba pilih tanggal lain.
              </p>
            </div>
          ) : (
            <div className="uo-table-wrap">
              <table className="uo-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Outlet</th>
                    <th>Area</th>
                    <th>Produk</th>
                    <th>Keterangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const outlet = outlets.find(
                      (item) => item.id === entry.outlet_id,
                    );
                    const product = products.find(
                      (item) => item.id === entry.product_id,
                    );
                    const key = `${entry.outlet_id}-${entry.product_id}`;

                    return (
                      <tr key={key}>
                        <td>
                          <span className="uo-date-chip">
                            <CalendarDays size={14} />
                            {formatDate(entry.transaction_date)}
                          </span>
                        </td>
                        <td>
                          <div className="uo-outlet-cell">
                            <span className="uo-outlet-avatar">
                              {(outlet?.name ?? "O")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                            <strong>{outlet?.name ?? "Outlet"}</strong>
                          </div>
                        </td>
                        <td>
                          {outlet?.area ? (
                            <span className="uo-area-chip">
                              {outlet.area}
                            </span>
                          ) : (
                            <span className="uo-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className="uo-product-chip">
                            {product?.name ?? "Produk"}
                          </span>
                        </td>
                        <td className="uo-notes-cell">
                          {entry.notes || (
                            <span className="uo-muted">Tidak ada catatan</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="uo-btn uo-btn-danger"
                            disabled={deletingKey === key}
                            onClick={() => void removeEntry(entry)}
                            title="Hapus transaksi"
                          >
                            {deletingKey === key ? (
                              <RefreshCw
                                size={14}
                                className="uo-spin"
                              />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            <span>
                              {deletingKey === key
                                ? "Menghapus"
                                : "Hapus"}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="uo-history-footer">
            <span>
              Menampilkan <strong>{filteredEntries.length}</strong> catatan
              transaksi
            </span>
            <span>
              Tanggal: <strong>{formatDate(date)}</strong>
            </span>
          </div>
        </section>

        <style jsx global>{`
          .uo-page {
            width: 100%;
            max-width: 1500px;
            margin: 0 auto;
            padding: 28px;
            color: #172b4d;
            font-size: 14px;
          }

          .uo-page *,
          .uo-page *::before,
          .uo-page *::after {
            box-sizing: border-box;
          }

          .uo-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 25px;
          }

          .uo-heading {
            min-width: 0;
          }

          .uo-eyebrow {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 8px;
            color: #2874d0;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.3px;
          }

          .uo-heading h1 {
            margin: 0;
            color: #12284a;
            font-size: clamp(25px, 2.4vw, 32px);
            font-weight: 800;
            letter-spacing: -1px;
            line-height: 1.25;
          }

          .uo-heading p {
            max-width: 640px;
            margin: 9px 0 0;
            color: #718198;
            font-size: 13px;
            line-height: 1.7;
          }

          .uo-btn {
            display: inline-flex;
            min-height: 40px;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 15px;
            border: 1px solid transparent;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.2;
            cursor: pointer;
            transition:
              transform 0.18s ease,
              background 0.18s ease,
              border-color 0.18s ease,
              box-shadow 0.18s ease;
          }

          .uo-btn:hover:not(:disabled) {
            transform: translateY(-1px);
          }

          .uo-btn:disabled {
            cursor: not-allowed;
            opacity: 0.55;
          }

          .uo-btn-outline {
            flex-shrink: 0;
            border-color: #dce5f0;
            background: #fff;
            color: #36516f;
          }

          .uo-btn-outline:hover:not(:disabled) {
            border-color: #a9c7ee;
            background: #f3f8ff;
          }

          .uo-btn-light {
            min-height: 35px;
            padding: 8px 12px;
            border-color: #dce7f5;
            background: #f4f8ff;
            color: #2865b5;
          }

          .uo-btn-primary {
            min-height: 44px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #246fe5, #1655c0);
            box-shadow: 0 5px 13px rgb(36 111 229 / 19%);
            color: white;
          }

          .uo-btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #185fcf, #1049ab);
            box-shadow: 0 7px 17px rgb(36 111 229 / 26%);
          }

          .uo-btn-green {
            min-height: 42px;
            background: #12805c;
            color: #fff;
          }

          .uo-btn-green:hover:not(:disabled) {
            background: #096b4b;
          }

          .uo-btn-danger {
            min-height: 32px;
            padding: 7px 10px;
            border-color: #f5d3d5;
            background: #fff3f3;
            color: #c43c46;
          }

          .uo-btn-danger:hover:not(:disabled) {
            border-color: #efb6ba;
            background: #ffe4e5;
          }

          .uo-spin {
            animation: uo-spin 0.8s linear infinite;
          }

          @keyframes uo-spin {
            to {
              transform: rotate(360deg);
            }
          }

          .uo-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
            padding: 12px 14px;
            border: 1px solid;
            border-radius: 11px;
            font-size: 13px;
            line-height: 1.5;
          }

          .uo-alert > span {
            flex: 1;
            overflow-wrap: anywhere;
          }

          .uo-alert > button {
            display: grid;
            width: 28px;
            height: 28px;
            flex-shrink: 0;
            place-items: center;
            border: 0;
            border-radius: 7px;
            background: transparent;
            cursor: pointer;
          }

          .uo-alert-error {
            border-color: #fecaca;
            background: #fff1f2;
            color: #b42332;
          }

          .uo-alert-error > button {
            color: #b42332;
          }

          .uo-alert-success {
            border-color: #bcebd4;
            background: #effcf5;
            color: #08784e;
          }

          .uo-alert-success > button {
            color: #08784e;
          }

          .uo-stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 22px;
          }

          .uo-stat {
            min-width: 0;
            padding: 19px 20px;
            border: 1px solid #e4ebf5;
            border-radius: 15px;
            background: #fff;
            box-shadow: 0 4px 18px rgb(30 64 120 / 4%);
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease;
          }

          .uo-stat:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgb(30 64 120 / 8%);
          }

          .uo-stat-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .uo-stat-icon {
            display: grid;
            width: 42px;
            height: 42px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 12px;
          }

          .uo-stat-icon.blue {
            background: #e9f2ff;
            color: #286be1;
          }

          .uo-stat-icon.purple {
            background: #f0eaff;
            color: #7653d5;
          }

          .uo-stat-icon.green {
            background: #e5f8ee;
            color: #16835a;
          }

          .uo-stat-caption {
            color: #8290a5;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.65px;
            text-align: right;
          }

          .uo-stat-value {
            margin-top: 15px;
            color: #172d4f;
            font-size: 31px;
            font-weight: 800;
            letter-spacing: -1px;
            line-height: 1.1;
          }

          .uo-stat-date {
            margin-top: 15px;
            color: #172d4f;
            font-size: 16px;
            font-weight: 800;
            line-height: 1.5;
          }

          .uo-stat > p {
            margin: 8px 0 0;
            color: #8491a5;
            font-size: 11px;
            line-height: 1.5;
          }

          .uo-panel {
            min-width: 0;
            margin-bottom: 22px;
            padding: 23px;
            border: 1px solid #e4ebf5;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 4px 20px rgb(30 64 120 / 4%);
          }

          .uo-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 22px;
          }

          .uo-panel-title {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 13px;
          }

          .uo-title-icon {
            display: grid;
            width: 43px;
            height: 43px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 12px;
            background: #eaf2ff;
            color: #286be1;
          }

          .uo-title-icon.green {
            background: #e5f8ee;
            color: #12805c;
          }

          .uo-title-icon.orange {
            background: #fff2e6;
            color: #d77922;
          }

          .uo-panel-title h2 {
            margin: 0;
            color: #172d4f;
            font-size: 17px;
            font-weight: 800;
            letter-spacing: -0.3px;
          }

          .uo-panel-title p {
            margin: 5px 0 0;
            color: #8290a5;
            font-size: 12px;
            line-height: 1.6;
          }

          .uo-step {
            flex-shrink: 0;
            padding: 7px 10px;
            border-radius: 7px;
            background: #f2f6fc;
            color: #71839c;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }

          .uo-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }

          .uo-field {
            display: flex;
            min-width: 0;
            flex-direction: column;
            gap: 8px;
          }

          .uo-field label {
            color: #344965;
            font-size: 12px;
            font-weight: 750;
          }

          .uo-field label span {
            color: #9aa6b7;
            font-weight: 500;
          }

          .uo-field input,
          .uo-field select {
            width: 100%;
            min-width: 0;
            height: 43px;
            padding: 0 12px;
            border: 1px solid #dce5f0;
            border-radius: 9px;
            outline: none;
            background: #fff;
            color: #253c59;
            font: inherit;
            font-size: 12px;
            transition:
              border-color 0.18s ease,
              box-shadow 0.18s ease,
              background 0.18s ease;
          }

          .uo-field input::placeholder {
            color: #a1adbc;
          }

          .uo-field input:focus,
          .uo-field select:focus {
            border-color: #4c8dea;
            box-shadow: 0 0 0 3px rgb(61 130 230 / 12%);
          }

          .uo-input-wrap,
          .uo-select-wrap {
            position: relative;
            display: flex;
            min-width: 0;
            align-items: center;
          }

          .uo-input-wrap > svg {
            position: absolute;
            left: 12px;
            z-index: 1;
            flex-shrink: 0;
            color: #8798af;
            pointer-events: none;
          }

          .uo-input-wrap input {
            padding-left: 39px;
          }

          .uo-select-wrap select {
            padding-right: 36px;
            appearance: none;
            cursor: pointer;
          }

          .uo-select-wrap > svg {
            position: absolute;
            right: 12px;
            color: #7d8da3;
            pointer-events: none;
          }

          .uo-field > small {
            color: #8a98ab;
            font-size: 10px;
            line-height: 1.5;
          }

          .uo-field > .uo-help-error {
            color: #d13e4c;
          }

          .uo-input {
            padding: 0 12px;
          }

          .uo-product-section {
            margin-top: 26px;
            padding-top: 23px;
            border-top: 1px solid #edf1f7;
          }

          .uo-product-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 16px;
          }

          .uo-product-heading h3 {
            margin: 0;
            color: #213956;
            font-size: 13px;
            font-weight: 800;
          }

          .uo-product-heading p {
            margin: 5px 0 0;
            color: #8996a8;
            font-size: 11px;
            line-height: 1.5;
          }

          .uo-products {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 11px;
          }

          .uo-product {
            display: flex;
            min-width: 0;
            min-height: 65px;
            align-items: center;
            gap: 11px;
            padding: 12px;
            border: 1px solid #e3eaf4;
            border-radius: 11px;
            background: #fff;
            cursor: pointer;
            transition:
              border-color 0.18s ease,
              background 0.18s ease,
              box-shadow 0.18s ease,
              transform 0.18s ease;
          }

          .uo-product:hover {
            transform: translateY(-1px);
            border-color: #a9c7f4;
            background: #f8fbff;
          }

          .uo-product.selected {
            border-color: #6da1f1;
            background: #f0f6ff;
            box-shadow: inset 0 0 0 1px rgb(65 126 224 / 9%);
          }

          .uo-product > input {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            opacity: 0;
          }

          .uo-product-mark {
            display: grid;
            width: 36px;
            height: 36px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 10px;
            background: #eaf2ff;
            color: #286be1;
          }

          .uo-product-mark.mark-1 {
            background: #e8f8f0;
            color: #16835a;
          }

          .uo-product-mark.mark-2 {
            background: #f0eaff;
            color: #7958ce;
          }

          .uo-product-mark.mark-3 {
            background: #fff2e4;
            color: #c97825;
          }

          .uo-product-mark.mark-4 {
            background: #e5f6f8;
            color: #17808d;
          }

          .uo-product-name {
            min-width: 0;
            flex: 1;
            color: #344965;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.5;
            overflow-wrap: anywhere;
          }

          .uo-product.selected .uo-product-name {
            color: #1f58a8;
          }

          .uo-checkbox {
            display: grid;
            width: 19px;
            height: 19px;
            flex-shrink: 0;
            place-items: center;
            border: 1.5px solid #cbd6e5;
            border-radius: 5px;
            background: #fff;
            color: #fff;
          }

          .uo-product.selected .uo-checkbox {
            border-color: #3478e5;
            background: #3478e5;
          }

          .uo-selection-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 15px;
          }

          .uo-selection-footer > span {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #7d8da3;
            font-size: 11px;
          }

          .uo-selection-footer > span svg {
            color: #19875d;
          }

          .uo-selection-footer strong {
            color: #246bd0;
          }

          .uo-text-button {
            padding: 5px 0;
            border: 0;
            background: transparent;
            color: #d34a55;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
          }

          .uo-form-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-top: 23px;
            padding-top: 18px;
            border-top: 1px solid #edf1f7;
          }

          .uo-form-footer p {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            color: #8996a8;
            font-size: 11px;
            line-height: 1.5;
          }

          .uo-required-dot {
            width: 7px;
            height: 7px;
            flex-shrink: 0;
            border-radius: 50%;
            background: #3478e5;
          }

          .uo-new-outlet-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
            align-items: end;
          }

          .uo-new-outlet-action {
            display: flex;
            align-items: end;
          }

          .uo-empty {
            padding: 25px 15px;
            border: 1px dashed #dce5f0;
            border-radius: 11px;
            background: #fafcff;
            color: #8290a5;
            font-size: 12px;
            text-align: center;
          }

          .uo-empty-large {
            display: flex;
            min-height: 190px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 28px;
          }

          .uo-empty-icon {
            display: grid;
            width: 52px;
            height: 52px;
            margin-bottom: 12px;
            place-items: center;
            border-radius: 15px;
            background: #edf4ff;
            color: #4b7fca;
          }

          .uo-empty-large strong {
            color: #344965;
            font-size: 13px;
          }

          .uo-empty-large p {
            max-width: 380px;
            margin: 7px 0 0;
            color: #8a98ab;
            font-size: 11px;
            line-height: 1.7;
            text-align: center;
          }

          .uo-history-count {
            flex-shrink: 0;
            padding: 7px 10px;
            border-radius: 8px;
            background: #edf4ff;
            color: #2868c8;
            font-size: 11px;
            font-weight: 800;
          }

          .uo-history-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 18px;
            padding: 13px 15px;
            border: 1px solid #e8eef6;
            border-radius: 11px;
            background: #f8faff;
          }

          .uo-history-date {
            display: flex;
            align-items: center;
            gap: 11px;
            color: #3274cf;
          }

          .uo-history-date > svg {
            flex-shrink: 0;
          }

          .uo-history-date > div {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .uo-history-date small {
            color: #8795a8;
            font-size: 10px;
          }

          .uo-history-date strong {
            color: #263f60;
            font-size: 12px;
          }

          .uo-filter-field {
            width: min(260px, 100%);
            gap: 6px;
          }

          .uo-filter-field label {
            color: #7c8da4;
            font-size: 10px;
          }

          .uo-filter-field select {
            height: 37px;
            background: #fff;
          }

          .uo-table-wrap {
            width: 100%;
            overflow-x: auto;
            border: 1px solid #e7edf5;
            border-radius: 11px;
          }

          .uo-table {
            width: 100%;
            min-width: 830px;
            border-collapse: separate;
            border-spacing: 0;
            text-align: left;
          }

          .uo-table thead th {
            padding: 13px 14px;
            border-bottom: 1px solid #e6edf6;
            background: #f6f9fd;
            color: #708198;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.35px;
            white-space: nowrap;
          }

          .uo-table tbody td {
            padding: 13px 14px;
            border-bottom: 1px solid #edf1f6;
            color: #4c607a;
            font-size: 11px;
            vertical-align: middle;
          }

          .uo-table tbody tr:last-child td {
            border-bottom: 0;
          }

          .uo-table tbody tr {
            transition: background 0.15s ease;
          }

          .uo-table tbody tr:hover {
            background: #f8fbff;
          }

          .uo-date-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            border: 1px solid #e2eaf5;
            border-radius: 7px;
            background: #f8faff;
            color: #536b88;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
          }

          .uo-date-chip svg {
            flex-shrink: 0;
            color: #4e82d0;
          }

          .uo-outlet-cell {
            display: flex;
            min-width: 130px;
            align-items: center;
            gap: 9px;
          }

          .uo-outlet-cell strong {
            color: #273e5d;
            font-size: 11px;
            font-weight: 750;
          }

          .uo-outlet-avatar {
            display: grid;
            width: 30px;
            height: 30px;
            flex-shrink: 0;
            place-items: center;
            border-radius: 9px;
            background: #e9f1ff;
            color: #2e69bf;
            font-size: 12px;
            font-weight: 800;
          }

          .uo-area-chip {
            display: inline-block;
            max-width: 160px;
            padding: 5px 8px;
            overflow-wrap: anywhere;
            border-radius: 6px;
            background: #f0f5fb;
            color: #62758d;
            font-size: 10px;
          }

          .uo-product-chip {
            display: inline-block;
            padding: 6px 9px;
            border: 1px solid #dce8fb;
            border-radius: 7px;
            background: #eef5ff;
            color: #285da7;
            font-size: 10px;
            font-weight: 750;
            line-height: 1.5;
          }

          .uo-notes-cell {
            max-width: 190px;
            overflow-wrap: anywhere;
            line-height: 1.6;
          }

          .uo-muted {
            color: #a1adbc;
            font-size: 10px;
          }

          .uo-history-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 14px;
            color: #8996a8;
            font-size: 10px;
          }

          .uo-history-footer strong {
            color: #526782;
          }

          @media (max-width: 1050px) {
            .uo-page {
              padding: 22px;
            }

            .uo-products {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .uo-new-outlet-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .uo-new-outlet-action {
              grid-column: 1 / -1;
            }
          }

          @media (max-width: 700px) {
            .uo-page {
              padding: 16px 12px 28px;
            }

            .uo-header {
              align-items: flex-start;
              gap: 10px;
              margin-bottom: 19px;
            }

            .uo-heading h1 {
              font-size: 24px;
              letter-spacing: -0.7px;
            }

            .uo-heading p {
              margin-top: 7px;
              font-size: 12px;
            }

            .uo-header > .uo-btn {
              min-height: 36px;
              gap: 6px;
              padding: 8px 10px;
              font-size: 10px;
            }

            .uo-stats {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 15px;
            }

            .uo-stat {
              padding: 14px;
              border-radius: 13px;
            }

            .uo-stat:last-child {
              grid-column: 1 / -1;
            }

            .uo-stat-icon {
              width: 35px;
              height: 35px;
              border-radius: 10px;
            }

            .uo-stat-caption {
              font-size: 9px;
              letter-spacing: 0.2px;
            }

            .uo-stat-value {
              margin-top: 12px;
              font-size: 27px;
            }

            .uo-stat-date {
              margin-top: 10px;
              font-size: 14px;
            }

            .uo-stat > p {
              font-size: 10px;
            }

            .uo-panel {
              margin-bottom: 15px;
              padding: 16px 13px;
              border-radius: 13px;
            }

            .uo-panel-header {
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 18px;
            }

            .uo-panel-title {
              gap: 10px;
            }

            .uo-title-icon {
              width: 37px;
              height: 37px;
              border-radius: 10px;
            }

            .uo-panel-title h2 {
              font-size: 14px;
            }

            .uo-panel-title p {
              font-size: 10px;
            }

            .uo-step {
              padding: 6px 7px;
              font-size: 8px;
            }

            .uo-form-grid,
            .uo-new-outlet-grid {
              grid-template-columns: minmax(0, 1fr);
              gap: 16px;
            }

            .uo-new-outlet-action {
              grid-column: auto;
            }

            .uo-new-outlet-action .uo-btn {
              width: 100%;
            }

            .uo-field label {
              font-size: 11px;
            }

            .uo-field input,
            .uo-field select {
              height: 42px;
              font-size: 12px;
            }

            .uo-product-section {
              margin-top: 21px;
              padding-top: 18px;
            }

            .uo-product-heading {
              align-items: flex-start;
              gap: 8px;
            }

            .uo-product-heading h3 {
              font-size: 12px;
            }

            .uo-product-heading p {
              max-width: 240px;
              font-size: 10px;
            }

            .uo-product-heading .uo-btn {
              min-height: 32px;
              gap: 5px;
              padding: 7px 8px;
              font-size: 9px;
              white-space: nowrap;
            }

            .uo-products {
              grid-template-columns: minmax(0, 1fr);
              gap: 8px;
            }

            .uo-product {
              min-height: 57px;
              padding: 10px;
            }

            .uo-product-mark {
              width: 33px;
              height: 33px;
            }

            .uo-product-name {
              font-size: 11px;
            }

            .uo-form-footer {
              align-items: stretch;
              flex-direction: column;
              gap: 13px;
              margin-top: 19px;
              padding-top: 16px;
            }

            .uo-form-footer p {
              align-items: flex-start;
              font-size: 10px;
            }

            .uo-form-footer .uo-btn {
              width: 100%;
            }

            .uo-history-toolbar {
              align-items: stretch;
              flex-direction: column;
              gap: 14px;
              padding: 12px;
            }

            .uo-filter-field {
              width: 100%;
            }

            .uo-history-footer {
              align-items: flex-start;
              flex-direction: column;
              gap: 6px;
            }

            .uo-history-count {
              font-size: 9px;
            }

            .uo-table {
              min-width: 790px;
            }

            .uo-alert {
              align-items: flex-start;
              padding: 11px;
              font-size: 11px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .uo-page *,
            .uo-page *::before,
            .uo-page *::after {
              scroll-behavior: auto !important;
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
