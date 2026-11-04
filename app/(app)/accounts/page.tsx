import { Plus, Wallet } from "lucide-react";
import { createAccountAction, changeOpeningBalanceAction } from "@/app/actions";
import { BANK_PRESETS, EWALLET_PRESETS, ACCOUNT_TYPE_LABELS } from "@/lib/accounts/presets";
import { formatRupiah, getJakartaDate } from "@/lib/finance/format";
import type { WalletBalanceRow } from "@/lib/finance/types";
import { getAuthenticatedUser } from "@/lib/supabase/server";

const ACCOUNT_NAME_SUGGESTIONS = [...new Set(
  [...BANK_PRESETS, ...EWALLET_PRESETS, "SPayLater", "Kredivo", "Dompet utama", "Celengan"]
    .filter((name) => name !== "Lainnya"),
)];

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return null;
  const [walletResult, adjustmentResult] = await Promise.all([
    supabase.from("wallet_balances").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("account_balance_adjustments").select("account_id,adjustment_type,amount_delta").eq("user_id", user.id),
  ]);
  const wallets = walletResult.data;
  const adjustments = adjustmentResult.data;
  const accounts = (wallets ?? []) as WalletBalanceRow[];
  const openingAdjustments = adjustments ?? [];
  const defaults = new Map<string, number>();
  openingAdjustments.filter((row) => row.adjustment_type === "opening_edit").forEach((row) => defaults.set(row.account_id, (defaults.get(row.account_id) ?? 0) + Number(row.amount_delta)));

  return (
    <div className="space-y-7">
      <div><p className="section-label">Pengelolaan akun</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Dompet</h1><p className="mt-2 text-sm text-slate-500">Atur saldo bank, e-wallet, tunai, aset, piutang, dan utangmu.</p></div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
      {(walletResult.error || adjustmentResult.error) && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">Data akun belum dapat dimuat. Pastikan migrasi Supabase sudah dijalankan.</p>}
      <section className="surface p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Plus size={19} /></span><div><h2 className="text-lg font-bold">Tambah akun</h2><p className="mt-1 text-sm text-slate-500">Saldo awal disimpan sebagai posisi saat ini, bukan pemasukan.</p></div></div>
        <form action={createAccountAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold">Jenis akun<select name="type" className="field mt-1.5" defaultValue="bank"><option value="bank">Bank</option><option value="ewallet">E-wallet</option><option value="cash">Tunai</option><option value="investment">Investasi</option><option value="receivable">Piutang</option><option value="paylater">Paylater</option><option value="loan">Pinjaman</option><option value="payable">Utang ke orang</option></select></label>
          <label className="text-sm font-semibold">Nama akun<input className="field mt-1.5" name="name" list="account-presets" placeholder="BCA, Dompet utama…" required maxLength={80} /><datalist id="account-presets">{ACCOUNT_NAME_SUGGESTIONS.map((name) => <option key={name} value={name} />)}</datalist></label>
          <label className="text-sm font-semibold">Saldo sekarang (Rupiah)<input className="field mt-1.5" name="openingBalance" inputMode="numeric" type="number" min="0" step="1" defaultValue="0" required /></label>
          <label className="text-sm font-semibold">Per tanggal<input className="field mt-1.5" name="openingDate" type="date" defaultValue={getJakartaDate()} required /></label>
          <label className="text-sm font-semibold">Bank / layanan (opsional)<input className="field mt-1.5" name="institution" maxLength={80} placeholder="Nama lembaga" /></label>
          <label className="text-sm font-semibold">Nama orang terkait (untuk piutang/utang)<input className="field mt-1.5" name="counterpartyName" maxLength={80} placeholder="Contoh: Andi" /></label>
          <label className="text-sm font-semibold">Limit (opsional)<input className="field mt-1.5" name="creditLimit" inputMode="numeric" type="number" min="0" step="1" /></label>
          <label className="text-sm font-semibold">Tanggal jatuh tempo (1–31)<input className="field mt-1.5" name="dueDay" inputMode="numeric" type="number" min="1" max="31" /></label>
          <div className="flex items-end"><button className="button-primary w-full sm:w-auto" type="submit"><Plus size={17} />Tambah akun</button></div>
        </form>
      </section>
      <section className="space-y-3">
        <div className="flex items-center gap-2"><Wallet size={19} className="text-emerald-700" /><h2 className="text-xl font-bold">Semua akun</h2></div>
        {accounts.length === 0 ? <div className="surface p-8 text-center"><p className="font-semibold">Belum ada akun tersimpan</p><p className="mt-1 text-sm text-slate-500">Isi formulir di atas untuk menambahkan akun.</p></div> : accounts.map((account) => (
          <article key={account.account_id} className="surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</p><h3 className="mt-1 text-lg font-bold">{account.name}</h3><p className="mt-0.5 text-sm text-slate-500">{account.counterparty_name ? `Dengan ${account.counterparty_name} · ` : ""}Mulai {account.opening_date}</p></div>
              <div className="text-right"><p className="text-xs text-slate-500">{account.kind === "liability" ? "Sisa utang" : "Saldo saat ini"}</p><p className="balance-number mt-1 text-xl font-extrabold">{formatRupiah(Number(account.balance))}</p></div>
            </div>
            <details className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-700 dark:text-emerald-400">Ubah saldo awal</summary>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Perubahan dicatat sebagai riwayat penyesuaian dan tidak masuk hitungan pemasukan atau pengeluaran.</p>
              <form action={changeOpeningBalanceAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input type="hidden" name="accountId" value={account.account_id} />
                <label className="max-w-xs flex-1 text-sm font-semibold">Saldo awal baru (Rupiah)<input className="field mt-1.5" name="openingBalance" inputMode="numeric" type="number" min="0" step="1" defaultValue={Number(account.opening_balance) + (defaults.get(account.account_id) ?? 0)} required /></label>
                <button className="button-secondary" type="submit">Simpan perubahan</button>
              </form>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
