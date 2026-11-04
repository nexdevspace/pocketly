# Deploy Pocketly

Dokumen ini memasang migrasi database ke Supabase Cloud dan menghubungkan repository GitHub ke Vercel.

## 1. Siapkan Supabase Cloud

Jika belum ada, buat proyek di [Supabase Dashboard](https://supabase.com/dashboard). Pilih organisasi dan region, buat password database, lalu tunggu sampai proyek siap. Catat Project ref dari alamat Dashboard dan ambil Project URL serta **publishable key** dari **Connect** atau **Project Settings → API Keys**.

Terapkan skema dari root repository. Perintah ini hanya mendorong migrasi yang belum diterapkan:

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run --remote
npx supabase db push --remote
npx supabase migration list --remote
```

Masukkan password database hanya saat CLI memintanya. Jangan gunakan `db reset --remote` untuk deployment normal.

## 2. Hubungkan GitHub ke Vercel

1. Dorong repository Pocketly ke GitHub.
2. Masuk ke [Vercel](https://vercel.com), pilih **Add New → Project**, hubungkan GitHub bila diminta, lalu import repository Pocketly.
3. Biarkan Framework Preset terdeteksi sebagai Next.js. Untuk repository ini, Root Directory adalah `.`.
4. Sebelum deploy, isi environment variables di bagian **Environment Variables**. Pilih target **Production**, **Preview**, dan **Development** sesuai kebutuhan:

   | Nama variabel | Nilai | Status |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL, misalnya `https://<project-ref>.supabase.co` | Publik; masuk ke browser |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` dari proyek tersebut | Publik; aman untuk browser, akses data tetap dibatasi RLS |
   | `NEXT_PUBLIC_SITE_URL` | Origin situs untuk environment itu, misalnya `https://pocketly.vercel.app` | Publik; dipakai membentuk URL callback Auth |

   Untuk proyek Supabase lama, aplikasi juga menerima `NEXT_PUBLIC_SUPABASE_ANON_KEY` sebagai pengganti publishable key. Isi salah satunya saja.

   **Tidak ada environment variable server-only yang dibutuhkan aplikasi ini.** Jangan menambahkan `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, password database, atau token akses Supabase ke env aplikasi ini. Kunci secret/service-role melewati RLS; password database dan token CLI juga rahasia dan tidak boleh masuk browser, Git, atau dokumen.

5. Klik **Deploy**. Push berikutnya ke production branch membuat deployment Production; branch atau pull request lain menghasilkan Preview Deployment. Setelah mengubah environment variables, buat deployment baru agar nilainya dipakai saat build.

Rujukan resmi: [Deploy repository Git di Vercel](https://vercel.com/docs/git), [pengaturan proyek Vercel](https://vercel.com/docs/project-configuration/project-settings).

## 3. Atur URL Auth di Supabase

Di Supabase Dashboard buka **Authentication → URL Configuration**:

- **Site URL**: origin canonical situs Production, tanpa path callback, misalnya `https://pocketly.vercel.app`. Ganti dengan domain khusus setelah domain tersebut aktif.
- **Redirect URLs**: tambahkan URL callback yang akan dipakai:
  - Lokal: `http://localhost:3000/auth/callback`
  - Production: `https://pocketly.vercel.app/auth/callback`
  - Opsional untuk Preview Vercel: `https://*-<team-or-account-slug>.vercel.app/**`.

Kode aplikasi membentuk callback sebagai `${NEXT_PUBLIC_SITE_URL}/auth/callback` dan menambahkan tujuan seperti `/onboarding` atau `/reset-password`. Karena itu, `NEXT_PUBLIC_SITE_URL` Production harus sama dengan origin pada Site URL, sedangkan path callback harus diizinkan pada Redirect URLs. Gunakan URL production yang persis; wildcard hanya untuk preview yang memang perlu menguji Auth. Jika memakai domain khusus, perbarui Site URL, daftar Redirect URLs, dan `NEXT_PUBLIC_SITE_URL` Vercel.

Untuk menguji email Auth dari Preview, set `NEXT_PUBLIC_SITE_URL` Preview ke origin Preview yang tetap dan masukkan callback itu ke Redirect URLs; atau gunakan Production untuk pengujian Auth. Pastikan domain yang muncul di email sama dengan URL yang diizinkan.

Rujukan resmi: [Supabase Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Rencana Fase 3: webhook dan cron

Fase 3 akan membutuhkan `SUPABASE_SERVICE_ROLE_KEY` untuk proses server-side webhook/cron yang memang memerlukan akses istimewa. Simpan hanya di secret environment Vercel/server, tanpa awalan `NEXT_PUBLIC_`; jangan masukkan ke `.env.example`, bundle browser, atau Git. Fase 1 tidak menggunakan kunci ini.

Service role melewati RLS, jadi setiap operasi webhook/cron pada data pengguna wajib menyaring `user_id` secara eksplisit. Ambil `user_id` dari relasi akun Telegram yang sudah diverifikasi di server, bukan dari input pesan yang dikirim pengguna. Terapkan `.eq("user_id", userId)` pada setiap select/update/delete yang menyentuh data pengguna, isi `user_id` secara eksplisit pada insert, dan pastikan relasi antarbaris tetap milik user yang sama. Review semua query webhook/cron untuk aturan ini sebelum Fase 3 dirilis.

## 4. Pemeriksaan setelah deploy

1. Buka domain Production dan pastikan halaman login terbuka tanpa pesan konfigurasi Supabase.
2. Uji pendaftaran dan pemulihan password. Buka tautan email dan pastikan browser kembali ke `/auth/callback`, lalu ke halaman tujuan.
3. Buat akun dengan dua pengguna berbeda dan pastikan masing-masing hanya melihat akun serta saldo miliknya.
