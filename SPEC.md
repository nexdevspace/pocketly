# Pocketly: Spesifikasi

## 0. Identitas
- Nama: "Pocketly". Konsisten di UI, metadata, manifest PWA, README, nama repo.
- Tagline: "Semua uangmu, satu kantong."
- Bot Telegram tampil sebagai "Pocketly". Username bot dibaca dari env TELEGRAM_BOT_USERNAME (nilai saya: mypocketly_bot), jangan di-hardcode.
- Visual: bersih, modern, mobile-first. Aksen emerald #059669, netral slate, dark mode. Wordmark teks + ikon kantong/saku untuk favicon dan ikon PWA.

## 1. Produk
Pelacak keuangan harian sampai bulanan yang menjawab:
(a) Uang saya ada di mana saja dan totalnya berapa? (aset)
(b) Saya punya utang dan piutang berapa? (kewajiban)
(c) Uang saya terpakai untuk apa? (laporan)
Pencatatan semudah ngechat: Telegram (teks/foto struk) atau form web. Tiap akhir bulan ada laporan Excel + PDF.
Pocketly TIDAK sinkron otomatis ke bank/e-wallet (tidak ada API gratis di Indonesia). Semua input dari user. Tulis ini sebagai keputusan sadar di README.

## 2. Tech stack
- Next.js (App Router) + TypeScript, Tailwind CSS
- Supabase (Postgres, Auth, Storage), RLS di semua tabel
- Recharts, Zod, Vitest, Playwright (E2E)
- Telegram Bot API via webhook (API route)
- Ekstraksi struk: Anthropic API (vision). Model lewat env ANTHROPIC_MODEL, cek dokumentasi resmi untuk model terbaru. Jangan hardcode.
- Laporan: exceljs (Excel), @react-pdf/renderer atau pdf-lib (PDF)
- Deploy: Vercel (+ Vercel Cron). CI: GitHub Actions.

## 3. Cara kerja kamu
- Kerjakan per fase (bagian 17), berurutan. Tiap fase: app jalan tanpa error, lint + type-check + test lolos, commit Conventional Commits (feat/fix/docs/test/chore), kecil dan sering. Setelah selesai, jelaskan singkat keputusan teknis penting, lalu BERHENTI dan tunggu konfirmasi.
- Jangan hardcode secret. Pakai .env.local + .env.example.
- Kode, komentar, commit, README: bahasa Inggris. UI dan teks bot: bahasa Indonesia, format Rupiah (Rp 25.000).
- Logika murni (saldo, parser nominal/tanggal/pesan, laporan) ada di lib/ tanpa ketergantungan ke Supabase/React, supaya mudah dites dan dipakai web + Telegram.
- Saya junior developer dan ingin memahami kodenya. Jelaskan bagian rawan (hitung saldo, parser, RLS) dengan bahasa sederhana.

## 4. Aturan data (wajib)
- Nominal integer rupiah (tanpa desimal). Zona waktu Asia/Jakarta untuk semua logika tanggal.
- Soft delete (deleted_at) untuk transaksi, transfer, savings_goals. Akun di-archive, tidak dihapus.
- Saldo TIDAK disimpan mentah; selalu dihitung dari data lewat view/fungsi (wallet_balances).
- View memakai security_invoker (atau cara lain yang terbukti menghormati RLS). Tes RLS: user A tidak bisa membaca data/saldo user B.
- Relasi antardata memeriksa kepemilikan user yang sama (tidak bisa menautkan ke akun milik user lain).
- 1 transaksi = 1 kategori.
- Tipe akun dibatasi CHECK constraint (bukan teks bebas).
- Seed kategori default untuk user baru lewat DATABASE TRIGGER.
- Skema tidak boleh menghalangi akun demo read-only (Fase 6) dan multi-user di masa depan.

## 5. Kelas akun dan rumus saldo
Kelas akun (accounts.kind) dan tipe (accounts.type):
- Aset: bank, ewallet, cash, investment (emas, reksadana, deposito, dll.)
- Piutang (aset): receivable (counterparty_name)
- Utang (kewajiban): paylater, loan, payable (counterparty_name)

Rumus:
- Aset: saldo = opening_balance + pemasukan - pengeluaran - transfer keluar (nominal saja) + transfer masuk.
- Utang: sisa utang = opening_balance + pengeluaran dari akun itu (belanja paylater) + transfer keluar dari akun itu (pencairan pinjaman) - transfer masuk ke akun itu (pembayaran).
- Biaya/bunga transfer dicatat sebagai transaksi pengeluaran terpisah yang ditautkan lewat transactions.transfer_id, memengaruhi akun ASAL, dan dihitung tepat SATU kali. Transfer itu sendiri hanya memindahkan nominalnya.
- Tes wajib: transfer 200.000 + admin 2.500 menurunkan saldo asal 202.500 dan menaikkan saldo tujuan 200.000.
- Tes wajib: pencairan SPinjam 1.000.000 ke BCA menaikkan BCA 1jt dan utang 1jt, kekayaan bersih tidak berubah.
- Transaksi biaya tidak bisa diedit/dihapus langsung; hanya lewat transfernya. Edit, soft delete, restore transfer menyinkronkan transaksi biayanya secara atomik.
- Transfer: akun asal != tujuan. Saldo asal kurang: peringatan, tetap boleh lanjut.

Dashboard (4 angka):
- Uang siap pakai (bank + ewallet + cash)
- Aset lain (piutang, investasi)
- Utang
- Kekayaan bersih = total aset - total utang
Kartu per akun dikelompokkan per tipe. Investasi dan piutang dikecualikan dari "uang siap pakai".

## 6. Onboarding dan manajemen akun
- Wizard pertama kali; dashboard terkunci sampai selesai (minimal 1 akun aset):
  1. Bank: pilih preset (BCA, BRI, BNI, Mandiri, SeaBank, Jago, BSI, CIMB, Permata, Blu, dll.) atau "Lainnya"; isi saldo sekarang; boleh banyak/skip.
  2. E-wallet: GoPay, OVO, DANA, ShopeePay, LinkAja, dll. + "Lainnya"; isi saldo.
  3. Tunai: dompet fisik, celengan, bisa lebih dari satu.
  4. Utang & piutang (opsional): SPinjam, SPayLater, Kredivo, utang/piutang ke orang; isi sisa utang, limit (opsional), jatuh tempo.
  5. Review: tampilkan angka dashboard, lalu tombol "Mulai pakai Pocketly".
- Tanggal mulai (default hari ini): semua saldo dianggap saldo pada tanggal itu.
- Tombol "+ Tambah akun" kapan saja (dashboard + halaman Dompet): tipe, nama, saldo saat ini, per tanggal (default hari ini). Di Telegram: /tambahakun (bot bertanya lewat tombol).
- Preset bank/e-wallet disimpan di kode (bukan database).
- Saldo awal BUKAN pemasukan: disimpan sebagai opening_balance + opening_date. Menambah akun di tengah bulan tidak menaikkan "pemasukan bulan ini".
- Transaksi sebelum opening_date akun itu: ditolak atau diberi peringatan.
- Edit saldo awal tercatat di account_balance_adjustments. Sarankan "Cocokin saldo" jika selisih karena transaksi terlupa.
- Archive akun dengan saldo belum nol: tawarkan transfer sisa atau koreksi dulu.
- Reset/ulang onboarding tersedia untuk akun demo dan testing.

## 7. Jenis transaksi dan kasus nyata
Tiga jenis dasar: Pengeluaran, Pemasukan, Transfer (antar akun apa pun, aset atau utang). Di web: satu tombol "+" dengan tab Pengeluaran | Pemasukan | Transfer. Pemasukan di web wajib memilih akun tujuan.

Kasus:
- Kakak kirim uang ke BCA: Pemasukan, kategori "Kiriman/Hadiah" (grup Non-pendapatan, dipisah dari Pendapatan di laporan). Jika sebenarnya pinjaman: catat sebagai utang ke "Kakak".
- Cairin SPinjam 1jt ke BCA: Transfer SPinjam -> BCA (bukan pemasukan).
- Belanja pakai SPayLater: Pengeluaran dari akun SPayLater.
- Bayar SPayLater 330rb (pokok 300rb + bunga 30rb): Transfer BCA -> SPayLater 300rb + pengeluaran "Bunga & Biaya" 30rb (tertaut transfer_id).
- Bayar utang ke teman via SeaBank: Transfer SeaBank -> Utang Budi.
- Minjem dari teman: Transfer Utang Budi -> akun tujuan.
- Minjemin ke teman: Transfer akun -> Piutang Andi. Teman bayar balik: Transfer Piutang Andi -> akun.
- Refund/cashback: Pemasukan kategori "Refund" (atau pengurang kategori asal).
- Nalangin lalu diganti: piutang, lalu transfer saat diganti.
- Bunga/biaya dicatat manual (hitung otomatis ditunda).

Kategori: grup Pendapatan (Gaji, Bonus, Jualan) dan Non-pendapatan (Kiriman/Hadiah, Refund, Lain-lain). Pengeluaran default: Makan & Minum, Belanja Harian, Transport, Tagihan, Hiburan, Kesehatan, Biaya Admin, Bunga & Biaya, Tak tercatat, Lain-lain. User bisa tambah, ubah nama, dan gabung kategori; riwayat tetap nyambung.

## 8. Bot Telegram

### 8.1 Hubungan akun dan keamanan
- Di web, user membuat kode link sekali pakai (kedaluwarsa 10 menit, disimpan dalam bentuk HASH). User kirim /start KODE. Webhook diverifikasi dengan secret token header. Abaikan chat_id yang belum terhubung.
- Idempotent: simpan update_id yang sudah diproses dan abaikan duplikat (Telegram bisa mengirim ulang). Ada tes.
- Tombol "putuskan Telegram" di web. Opsi "sembunyikan nominal" untuk balasan bot.
- Proses lama (struk): webhook langsung membalas "🧾 Lagi baca struknya...", lalu proses dan kirim hasil sebagai pesan baru. Jangan menahan webhook sampai ekstraksi selesai.
- Logging tidak boleh memuat nominal atau isi pesan; hanya jenis error dan ID.

### 8.2 Parser (fungsi murni, banyak tes)
Contoh pesan:
  makan siang 25rb gopay
  bayar wifi 165k
  kopi 18rb spaylater
  + gaji 5jt bca
  + kiriman kakak 500rb bca
  tf bca ke gopay 200rb admin 2500
  tarik bca 500rb                      (BCA -> Tunai)
  pinjol spinjam 1jt ke bca            (transfer utang -> bca)
  bayar spaylater 330rb bca bunga 30rb
  bayar utang budi 200rb seabank
  pinjamin andi 100rb tunai
  andi bayar 100rb gopay
  makan siang 25rb kemarin | wifi 165k tgl 5 | kopi 20rb 2 nov
  kopi 15rb, parkir 3rb, bensin 30rb   (3 transaksi, satu konfirmasi ringkas)
- Format nominal: 25000, 25.000, 25rb, 25k, 1,5jt, 1.5jt, 2jt.
- Tanggal opsional: "kemarin", "tgl N", "N bulan" (mis. "2 nov"); default hari ini (WIB).
- Akun disebut di akhir pesan (nama/alias, case-insensitive). Jika tidak disebut: pakai hasil belajar (merchant_rules), lalu akun default untuk pengeluaran; untuk pemasukan/transfer yang ambigu, bot bertanya lewat inline button.
- Kategori ditebak dari kata kunci (wifi/listrik/pdam/indihome/pulsa/kos -> Tagihan, makan -> Makan & Minum, grab/gojek -> Transport, dst.). Jika tidak ketebak, tanya sekali lewat button dan SIMPAN ke merchant_rules.
- Kata "bayar": jika diikuti nama akun utang/piutang terdaftar -> transfer pembayaran utang; jika tidak cocok -> pengeluaran biasa (mis. "bayar wifi 165k" = Tagihan); jika ambigu -> tanya lewat button. Tes wajib untuk dua contoh ini.
- Akun orang belum ada (mis. "pinjamin andi 100rb"): bot bertanya "Buat akun Piutang Andi?" lewat button.
- Pesan tidak terbaca (tanpa nominal, tidak jelas): JANGAN menebak atau menyimpan. Balas petunjuk singkat dengan contoh.
- Nominal tidak wajar (di atas Rp 5.000.000 atau jauh di atas rata-rata kategori): minta konfirmasi lewat button sebelum menyimpan.

### 8.3 Balasan dan perintah
- Selalu tampilkan kategori + akun agar mudah dikoreksi. Contoh: "✅ Rp 165.000 · Tagihan · BCA. Salah? /ubah atau /hapus_terakhir"
- Perintah: /saldo, /utang (utang + piutang + jatuh tempo), /hari_ini, /bulan_ini, /hapus_terakhir, /ubah, /cocokin <akun> <saldo>, /tambahakun, /bantuan.
- Pengingat catat harian (opsional, bisa dimatikan): jika sampai sekitar jam 21.00 belum ada catatan, tanya "ada yang belum dicatat hari ini?". Toleransi waktu karena batas cron Vercel Hobby.

## 9. Foto struk (Rilis 2)
1. Foto dikirim via Telegram atau web; kompres/resize sebelum ke API.
2. Anthropic vision dengan prompt JSON ketat {merchant, date, total, items[] opsional, confidence}; validasi Zod; jangan percaya output mentah.
3. Bot membalas DRAFT (belum disimpan): toko, tanggal, total, kategori tebakan, pilihan akun bayar, [Simpan] [Ubah] [Batal]. Ingat pilihan per toko (merchant_rules).
4. Setelah Simpan: transaksi (source='receipt') + foto di bucket Supabase Storage PRIVAT, tertaut di tabel receipts (+ raw_extraction).
5. Duplikat (toko + tanggal + total sama): tanya konfirmasi.
6. Fallback: tidak terbaca/confidence rendah -> minta ketik manual, jangan error mentah.
7. Batas 30 foto/user/hari DAN batas biaya API bulanan (env). Default hanya total; items disimpan di raw_extraction saja.

## 10. Utang, cicilan, dan fitur pintar
- Daftar utang/piutang per orang/layanan: sisa, jatuh tempo; pengingat Telegram H-3 dan hari H.
- Paylater/cicilan: sisa limit, template cicilan ("tiap tanggal X bayar Rp Y, pokok Z, bunga W"), sisa tenor (mis. 3 dari 6), otomatis berhenti saat lunas.
- Cocokin saldo (web + /cocokin): bandingkan saldo nyata vs hitungan; selisih ditawarkan jadi koreksi "Tak tercatat" dengan KONFIRMASI.
- Budget per kategori per bulan, progress bar, peringatan >80% dan >100%; tombol "salin budget bulan lalu".
- Target nabung dengan progress bar.
- Transaksi berulang (idempotent, tidak dobel): wifi, kos, langganan, cicilan.
- Pencarian transaksi + tag (mis. #liburan).
- Input nominal di web: keypad angka di HP, format ribuan otomatis.

## 11. Laporan bulanan (Rilis 2)
- Dibuat otomatis tanggal 1 (cron), dikirim ke Telegram, bisa diunduh di menu Laporan untuk bulan mana pun.
- Excel: Ringkasan (pemasukan, pengeluaran, selisih, saldo awal vs akhir, kekayaan bersih awal vs akhir), Per kategori (+ banding bulan lalu), Per akun (awal, masuk, keluar, akhir), Utang & piutang (nambah, dibayar, sisa), Budget vs realisasi, Semua transaksi (bisa difilter).
- PDF 1-2 halaman: ringkasan, donut kategori, tren, posisi utang.
- Baris terpisah "Akun baru / saldo awal" untuk akun yang ditambah di tengah bulan. Rumus tetap nyambung: saldo akhir = saldo awal bulan + akun baru + masuk - keluar +/- transfer. Tes wajib.
- Month lock: laporan disimpan sebagai SNAPSHOT (tabel reports). Edit transaksi di bulan yang sudah ditutup butuh konfirmasi, lalu laporan dibuat ulang.
- Isi laporan dihitung di lib/reports.ts (fungsi murni, dites); exceljs dan PDF hanya merender hasilnya.

## 12. Keamanan, privasi, data
- RLS semua tabel, bucket struk privat, tidak ada secret di repo, validasi server-side, rate limiting (webhook, auth, upload).
- PIN/kunci web opsional. Reset password dan verifikasi email.
- "Unduh semua data saya" (JSON/CSV). Hapus akun + semua data. Pengingat bulanan untuk backup.
- Halaman "Tentang data saya": data apa yang disimpan dan di mana.

## 13. Database (migrasi di /supabase/migrations, per fase)
- profiles: onboarding_completed_at, start_date
- accounts: kind, type (CHECK), name, institution, opening_balance, opening_date, credit_limit, due_day, counterparty_name, is_default, is_archived
- account_balance_adjustments: riwayat edit saldo awal dan koreksi
- categories: name, type, group (income_group/non_income), is_system
- transactions: type, account_id, category_id, amount (>0), note, date, source (text/receipt/web/recurring/system), transfer_id, deleted_at
- transfers: from_account_id, to_account_id, amount, fee, date, deleted_at (from != to)
- budgets, receipts, merchant_rules, savings_goals, recurring_transactions (+ pokok/bunga/tenor), telegram_links (hash kode, expires_at, chat_id), processed_telegram_updates (update_id), reports (month, file_path, snapshot, generated_at)
- View wallet_balances (security_invoker). Index masuk akal (user_id + date, account_id).

## 14. Batasan infrastruktur gratis
- Supabase free tier bisa mem-pause proyek tidak aktif: sediakan cron ringan harian yang menyentuh database agar demo tidak mati.
- Vercel Hobby membatasi cron: rancang pengingat dengan toleransi waktu dan dokumentasikan batasnya (cek dokumentasi terbaru).

## 15. Testing
- Unit (Vitest): saldo aset dan utang, biaya transfer (202.500), pencairan pinjaman, parser (nominal, tanggal, kasus ambigu, salah ketik, "bayar wifi" vs "bayar spaylater"), laporan (rekonsiliasi saldo), validasi ekstraksi struk (mock API, jangan panggil API sungguhan).
- RLS: user A tidak bisa membaca/mengubah data user B (termasuk lewat view).
- Idempotensi webhook dan transaksi berulang.
- E2E (Playwright), 1-2 alur: onboarding -> catat pengeluaran -> transfer -> saldo benar di dashboard.

## 16. Aturan UI
Mobile-first, dark mode, loading/empty/error state di semua halaman, UI Indonesia.

## 17. Rilis dan fase
RILIS 1 (dipakai tiap hari):
- Fase 1 Fondasi: auth (+reset password), wizard onboarding, akun aset + utang + tambah akun, kategori (trigger seed), CRUD transaksi, transfer (biaya atomik), saldo otomatis, dashboard 4 angka, unduh semua data, tes saldo + RLS, deploy awal Vercel.
- Fase 2 Insight: halaman utang/piutang + jatuh tempo, grafik (donut kategori, tren bulanan), budget + salin budget, cocokin saldo, archive dengan penanganan sisa saldo, cari + tag, export CSV, kelola kategori.
- Fase 3 Telegram: link akun, webhook aman + idempotent, parser lengkap (8.2), semua perintah, belajar kategori/akun, sembunyikan nominal, putuskan Telegram, E2E dasar.
RILIS 2 (otomatis dan polish):
- Fase 4 Struk: alur lengkap bagian 9.
- Fase 5 Otomatis: transaksi berulang, cicilan paylater, pengingat jatuh tempo + catat harian, rekap mingguan/bulanan via Telegram, target nabung, PWA, dark mode penuh.
- Fase 5b Laporan: bagian 11.
- Fase 6 Kualitas: mode demo (BCA, BRI, GoPay, ShopeePay, Tunai + SPayLater, data dummy 3 bulan, read-only, tanpa upload struk), CI (lint + type-check + test), hardening keamanan, hapus akun, halaman "Tentang data saya", README + diagram Mermaid, LICENSE MIT, /docs (deploy Vercel, setup Supabase, webhook Telegram, Anthropic API key).

## 18. Ditunda (JANGAN dibangun sekarang; pastikan skema tidak menghalangi)
Split item struk ke banyak kategori, hitung bunga otomatis, import mutasi rekening CSV, pengaturan notifikasi detail, laporan tahunan, auto-hapus foto struk lama, multi-user publik.

## 19. Definition of Done
Live di Vercel. Fitur Rilis 1 dan 2 berfungsi. Test, E2E, dan CI hijau. Install dari nol mengikuti README berhasil. Build production sukses. Riwayat commit rapi. Tidak ada secret di repo.

