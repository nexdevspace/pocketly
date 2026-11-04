# Setup Lokal

Panduan ini menyiapkan aplikasi Pocketly untuk pengembangan lokal. Database lokal berjalan di komputer sendiri; proyek Supabase Cloud hanya diperlukan jika ingin memakai database bersama atau menguji deployment.

## Prasyarat

- Git.
- Node.js 20.9 atau lebih baru dan npm.
- Docker Desktop yang sedang berjalan. Di Windows, aktifkan WSL 2 jika Docker Desktop memintanya.

## Jalankan Supabase lokal

Dari folder proyek:

```sh
npm ci
npm run db:start
```

`db:start` menjalankan stack Supabase lokal dan menerapkan migrasi di `supabase/migrations/`. Pada penggunaan pertama, Docker mengunduh image layanan Supabase dan perlu beberapa menit.

Lihat URL lokal dan kunci yang dibuat oleh CLI:

```sh
npx supabase status
```

Salin **API URL** ke `NEXT_PUBLIC_SUPABASE_URL`, dan **publishable key** ke `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Jika versi CLI/proyek lama hanya menampilkan **anon key**, isi `NEXT_PUBLIC_SUPABASE_ANON_KEY` sebagai pengganti. Jangan salin secret key atau service-role key ke aplikasi.

## Konfigurasi aplikasi

Buat `.env.local` dari templat:

```powershell
Copy-Item .env.example .env.local
```

Di macOS/Linux gunakan `cp .env.example .env.local`. Isi nilainya dengan URL dan publishable key dari `npx supabase status`, lalu pastikan alamat situs lokalnya:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=isi-dari-supabase-status
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Gunakan nilai API URL yang benar-benar ditampilkan CLI bila berbeda. Semua variabel `NEXT_PUBLIC_*` dapat masuk ke bundle browser, jadi hanya isi dengan URL dan kunci publishable/anon yang memang boleh diketahui publik. Aplikasi ini tidak memerlukan kunci Supabase rahasia atau kunci database.

`.env.local` sudah diabaikan oleh `.gitignore`; hanya `.env.example` yang berisi nama variabel dan nilai contoh boleh masuk Git.

## Jalankan aplikasi dan tes database

Di terminal pertama:

```sh
npm run dev
```

Buka `http://localhost:3000`. Jika konfirmasi email aktif, buka URL Mailpit yang ditampilkan `npx supabase status` untuk mengambil email konfirmasi lokal.

Perintah pengembangan database:

```sh
npm run db:test   # tes pgTAP lokal
npm run db:stop   # hentikan container; volume data lokal tetap tersimpan
```

`npx supabase db reset` membuang isi database lokal lalu menerapkan ulang seluruh migrasi. Gunakan hanya untuk data lokal yang memang boleh dihapus.

## Buat proyek Supabase Cloud

1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard), pilih organisasi, lalu buat proyek baru. Pilih region yang sesuai untuk pengguna dan simpan password database di password manager.
2. Tunggu status proyek menjadi siap. Dari **Connect** atau **Project Settings → API Keys**, salin Project URL dan buat/salin **publishable key**. Project ref terlihat di URL Dashboard: `https://supabase.com/dashboard/project/<project-ref>`.
3. Dari root repository, autentikasi CLI dan tautkan folder proyek ke Supabase Cloud:

   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```

   CLI dapat meminta password database untuk memeriksa koneksi. Masukkan pada prompt CLI; jangan simpan di `.env.local` atau Git.

4. Tinjau migrasi yang akan diterapkan, lalu terapkan migrasi yang belum ada di Cloud:

   ```sh
   npx supabase db push --dry-run --remote
   npx supabase db push --remote
   npx supabase migration list --remote
   ```

   Ini menjalankan berkas migrasi di `supabase/migrations/`, termasuk tabel, RLS, view saldo, fungsi transfer, serta trigger profil/kategori. Jangan gunakan `db reset --remote` pada database yang berisi data.

5. Untuk menjalankan aplikasi lokal menggunakan proyek Cloud, isi `.env.local` dengan Project URL, publishable key, dan `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Tambahkan `http://localhost:3000/auth/callback` ke Auth redirect URLs di Supabase seperti dijelaskan di [docs/deploy.md](deploy.md).

Rujukan resmi: [Supabase CLI dan alur lokal](https://supabase.com/docs/guides/local-development/cli-workflows), [API keys Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
