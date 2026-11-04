import { Download, FileJson, ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/finance/format";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function ExportPage() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return null;
  const { data: wallets, error } = await supabase.from("wallet_balances").select("balance,kind,type,is_archived").eq("user_id", user.id).eq("is_archived", false);
  const net = (wallets ?? []).reduce((total, account) => total + (account.kind === "asset" ? Number(account.balance) : -Number(account.balance)), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div><p className="section-label">Privasi & portabilitas</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Data saya</h1><p className="mt-2 text-sm text-slate-500">Unduh salinan data keuangan kapan saja.</p></div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">Ringkasan saldo belum dapat dimuat.</p>}
      <section className="surface p-5 sm:p-7">
        <div className="flex items-start gap-4"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><FileJson size={23} /></span><div><h2 className="text-lg font-bold">Unduh semua data</h2><p className="mt-1 leading-6 text-slate-500">Berkas JSON berisi akun, saldo hasil hitung, kategori, transaksi, transfer, dan riwayat penyesuaian milik Anda.</p></div></div>
        <a href="/api/export" className="button-primary mt-6"><Download size={17} />Unduh JSON</a>
      </section>
      <section className="surface p-5 sm:p-7">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-emerald-700 dark:text-emerald-400" size={21} /><div><h2 className="font-bold">Tentang data Anda</h2><p className="mt-1 leading-6 text-slate-500">Data disimpan di database Supabase Anda dan setiap tabel membatasi akses ke pemilik data. Pocketly tidak menyinkronkan saldo dengan bank atau e-wallet; semua catatan dimasukkan oleh Anda.</p><p className="mt-3 text-sm text-slate-500">Kekayaan bersih tercatat saat ini: <strong className="text-slate-800 dark:text-slate-100">{formatRupiah(net)}</strong>.</p></div></div>
      </section>
    </div>
  );
}
