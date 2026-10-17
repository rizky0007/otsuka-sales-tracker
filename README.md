# Otsuka Sales Tracker

Starter project Next.js + Supabase untuk mencatat target dan pencapaian sales, responsif untuk desktop dan mobile.

## Fitur di dalam ZIP
- Login dan pendaftaran akun Supabase Auth
- Dashboard ringkasan pencapaian
- Update harian outlet transaksi per produk
- Daftar outlet milik masing-masing user
- Update value harian per produk
- Pengaturan target outlet dan target value bulanan
- Riwayat pencatatan
- Sidebar responsif dan tampilan biru-putih

## 1. Persiapan
Gunakan Node.js versi 20.9 atau lebih baru. Buka terminal pada folder ini, lalu jalankan:

```bash
npm install
```

## 2. Konfigurasi Supabase
1. Buat proyek Supabase.
2. Buka Project Settings / API Keys, salin Project URL dan Publishable key.
3. Salin `.env.example` menjadi `.env.local`.
4. Isi URL dan publishable key asli ke `.env.local`.
5. Jangan membagikan database password atau secret/service_role key.

## 3. Buat tabel
Di Supabase buka SQL Editor → New query, lalu jalankan SQL yang ada pada `supabase/schema.sql`.

## 4. Auth
Di Supabase → Authentication → Providers → Email, pastikan Email provider aktif. Jika verifikasi email diaktifkan, pengguna harus membuka email verifikasi sebelum login.

Untuk pengembangan lokal, jalankan:

```bash
npm run dev
```

Lalu buka http://localhost:3000.

## Catatan
- Dashboard menghitung akumulasi dari tabel yang telah disimpan. Data akan kosong sampai user menambahkan outlet, target, dan update harian.
- RLS memisahkan data tiap user.
- Untuk deployment publik, tambahkan URL domain deployment di Authentication → URL Configuration.
- Proyek ini adalah starter yang dapat dikembangkan lebih lanjut; lakukan `npm run build` dan uji alur login, input, dan target sebelum digunakan secara operasional.
