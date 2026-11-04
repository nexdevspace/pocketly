import Link from "next/link";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Plus, Wallet } from "lucide-react";
import { getDashboardTotals } from "@/lib/finance/balances";
import { formatRupiah } from "@/lib/finance/format";
import type { AccountType } from "@/lib/finance/types";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/accounts/presets";

type WalletRow = { account_id: string; kind: "asset" | "liability"; type: AccountType; balance: number; name: string; is_archived: boolean; opening_balance: number };

export default async function DashboardPage() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return null;
  const [walletResult, transactionResult] = await Promise.all([
    supabase.from("wallet_balances").select("*").eq("user_id", user.id).eq("is_archived", false).order("created_at"),
    supabase.from("transactions").select("id,type,amount,note,date,deleted_at,categories(name)").eq("user_id", user.id).is("deleted_at", null).order("date", { ascending: false }).limit(6),
  ]);
  const wallets = (walletResult.data ?? []) as WalletRow[];
  const balances = wallets.map((wallet) => ({
    accountId: wallet.account_id,
    kind: wallet.kind,
    type: wallet.type as AccountType,
    balance: Number(wallet.balance),
  }));
  const totals = getDashboardTotals(balances);
  const recent = transactionResult.data ?? [];
  const groups = new Map<string, WalletRow[]>();
  wallets.forEach((wallet) => {
    const label = ACCOUNT_TYPE_LABELS[wallet.type] ?? "Lainnya";
    groups.set(label, [...(groups.get(label) ?? []), wallet]);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="section-label">Ringkasan keuangan</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Uangmu, sekilas</h1><p className="mt-2 text-sm text-slate-500">Halo{user.email ? `, ${user.email.split("@")[0]}` : ""}. Ini posisi akunmu saat ini.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/transactions?mode=expense" className="button-primary"><Plus size={17} />Catat transaksi</Link><Link href="/accounts" className="button-secondary"><Wallet size={17} />Tambah akun</Link></div>
      </div>

      {walletResult.error && <div role="alert" className="surface border-rose-200 p-4 text-sm text-rose-700">Saldo belum dapat dimuat. Pastikan migrasi Supabase sudah dijalankan.</div>}
      {transactionResult.error && <div role="alert" className="surface border-rose-200 p-4 text-sm text-rose-700">Riwayat transaksi belum dapat dimuat.</div>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Empat angka dashboard">
        <Metric label="Uang siap pakai" value={totals.readyMoney} icon={<Wallet size={18} />} tone="emerald" />
        <Metric label="Aset lain" value={totals.otherAssets} icon={<ArrowUpRight size={18} />} tone="blue" />
        <Metric label="Utang" value={totals.liabilities} icon={<ArrowDownRight size={18} />} tone="amber" />
        <Metric label="Kekayaan bersih" value={totals.netWorth} icon={<ArrowLeftRight size={18} />} tone="slate" strong />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="section-label">Dompetmu</p><h2 className="mt-1 text-xl font-bold">Saldo per akun</h2></div><Link href="/accounts" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Lihat semua</Link></div>
          {wallets.length === 0 ? <EmptyState title="Belum ada akun" body="Tambahkan bank, e-wallet, atau akun tunai untuk mulai." href="/accounts" label="Tambah akun" /> : <div className="mt-5 space-y-5">
            {[...groups.entries()].map(([label, rows]) => <div key={label}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><div className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((account) => <div key={account.account_id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-semibold">{account.name}</p><p className="text-xs text-slate-500">{account.kind === "liability" ? "Sisa kewajiban" : account.type === "receivable" ? "Piutang" : "Saldo"}</p></div><p className="balance-number shrink-0 font-bold">{formatRupiah(Number(account.balance))}</p></div>)}</div></div>)}
          </div>}
        </section>

        <section className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="section-label">Terbaru</p><h2 className="mt-1 text-xl font-bold">Catatan terakhir</h2></div><Link href="/transactions" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Semua transaksi</Link></div>
          {recent.length === 0 ? <EmptyState title="Belum ada transaksi" body="Catat pengeluaran, pemasukan, atau transfer pertamamu." href="/transactions" label="Buat catatan" /> : <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{recent.map((transaction) => {
            const category = transaction.categories as unknown as { name?: string } | null;
            const isIncome = transaction.type === "income";
            return <div key={transaction.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`rounded-xl p-2 ${isIncome ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{isIncome ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}</span><div className="min-w-0"><p className="truncate font-semibold">{category?.name ?? "Transaksi"}</p><p className="text-xs text-slate-500">{transaction.date}{transaction.note ? ` · ${transaction.note}` : ""}</p></div></div><p className={`shrink-0 font-bold tabular-nums ${isIncome ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{isIncome ? "+" : "−"}{formatRupiah(Number(transaction.amount))}</p></div>;
          })}</div>}
        </section>
      </div>
      <p className="text-center text-xs text-slate-400">Saldo berasal dari catatan yang kamu masukkan. Pocketly tidak menarik data otomatis dari bank atau e-wallet.</p>
    </div>
  );
}

function Metric({ label, value, icon, tone, strong = false }: { label: string; value: number; icon: React.ReactNode; tone: "emerald" | "blue" | "amber" | "slate"; strong?: boolean }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
  return <div className={`surface p-4 sm:p-5 ${strong ? "border-emerald-200 dark:border-emerald-900" : ""}`}><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{label}</p><span className={`rounded-lg p-2 ${tones[tone]}`}>{icon}</span></div><p className="balance-number mt-4 text-2xl font-extrabold sm:text-3xl">{formatRupiah(value)}</p></div>;
}

function EmptyState({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700"><p className="font-semibold">{title}</p><p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">{body}</p><Link href={href} className="mt-4 inline-flex font-semibold text-emerald-700 hover:underline dark:text-emerald-400">{label}</Link></div>;
}
