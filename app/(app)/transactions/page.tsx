import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, ArrowDownRight, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { restoreTransferAction, saveTransactionAction, saveTransferAction, softDeleteTransactionAction, softDeleteTransferAction } from "@/app/actions";
import { TransferForm } from "@/components/transfer-form";
import { formatRupiah, getJakartaDate } from "@/lib/finance/format";
import { getAuthenticatedUser } from "@/lib/supabase/server";

type Search = Promise<{ mode?: string; edit?: string; error?: string; message?: string }>;

export default async function TransactionsPage({ searchParams }: { searchParams: Search }) {
  const { mode = "expense", edit, error, message } = await searchParams;
  const activeMode = ["income", "expense", "transfer"].includes(mode) ? mode : "expense";
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return null;
  const [walletResult, categoryResult, transactionResult, transferResult, deletedTransferResult] = await Promise.all([
    supabase.from("wallet_balances").select("account_id,user_id,kind,type,name,balance,opening_date,is_archived").eq("user_id", user.id).eq("is_archived", false).order("created_at"),
    supabase.from("categories").select("id,name,type,category_group").eq("user_id", user.id),
    supabase.from("transactions").select("id,type,account_id,category_id,amount,note,date,deleted_at,categories(name)").eq("user_id", user.id).is("deleted_at", null).is("transfer_id", null).order("date", { ascending: false }).limit(50),
    supabase.from("transfers").select("id,from_account_id,to_account_id,amount,fee,date,deleted_at").eq("user_id", user.id).is("deleted_at", null).order("date", { ascending: false }).limit(30),
    supabase.from("transfers").select("id,from_account_id,to_account_id,amount,fee,date,deleted_at").eq("user_id", user.id).not("deleted_at", "is", null).order("date", { ascending: false }).limit(10),
  ]);
  const accounts = (walletResult.data ?? []) as Array<{ account_id: string; user_id: string; kind: string; type: string; name: string; balance: number; opening_date: string; is_archived: boolean }>;
  const categories = categoryResult.data ?? [];
  const transactions = transactionResult.data ?? [];
  const transfers = transferResult.data ?? [];
  const deletedTransfers = deletedTransferResult.data ?? [];
  const loadError = [walletResult, categoryResult, transactionResult, transferResult, deletedTransferResult].some((result) => result.error);
  const accountById = new Map(accounts.map((account) => [account.account_id, account]));
  const selectedTransaction = activeMode !== "transfer" && edit
    ? (await supabase.from("transactions").select("id,type,account_id,category_id,amount,note,date").eq("user_id", user.id).eq("id", edit).is("transfer_id", null).is("deleted_at", null).maybeSingle()).data
    : null;
  const selectedTransfer = activeMode === "transfer" && edit
    ? (await supabase.from("transfers").select("id,from_account_id,to_account_id,amount,fee,date").eq("user_id", user.id).eq("id", edit).is("deleted_at", null).maybeSingle()).data
    : null;
  const formType = activeMode === "income" ? "income" : "expense";
  const formCategories = categories.filter((category) => category.type === formType);
  const formAccounts = activeMode === "income" ? accounts.filter((account) => account.kind === "asset") : accounts;

  return (
    <div className="space-y-7">
      <div><p className="section-label">Catatan uang</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Transaksi</h1><p className="mt-2 text-sm text-slate-500">Catat pemasukan, pengeluaran, dan perpindahan antar akun.</p></div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
      {loadError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">Sebagian data transaksi belum dapat dimuat. Pastikan migrasi Supabase sudah dijalankan.</p>}

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 dark:border-slate-800" role="tablist" aria-label="Jenis catatan">
          <ModeLink href="/transactions?mode=expense" active={activeMode === "expense"}><ArrowUpRight size={16} />Pengeluaran</ModeLink>
          <ModeLink href="/transactions?mode=income" active={activeMode === "income"}><ArrowDownRight size={16} />Pemasukan</ModeLink>
          <ModeLink href="/transactions?mode=transfer" active={activeMode === "transfer"}><ArrowLeftRight size={16} />Transfer</ModeLink>
        </div>
        <div className="mt-5 max-w-3xl">
          {activeMode === "transfer" ? <>
            <h2 className="mb-4 text-lg font-bold">{selectedTransfer ? "Ubah transfer" : "Transfer antar akun"}</h2>
            <TransferForm accounts={accounts.map((account) => ({ id: account.account_id, name: account.name, kind: account.kind, type: account.type, balance: Number(account.balance) }))} action={saveTransferAction} transfer={selectedTransfer ?? undefined} />
          </> : <>
            <h2 className="mb-4 text-lg font-bold">{selectedTransaction ? "Ubah transaksi" : formType === "income" ? "Catat pemasukan" : "Catat pengeluaran"}</h2>
            <form action={saveTransactionAction} className="space-y-4">
              {selectedTransaction && <input type="hidden" name="transactionId" value={selectedTransaction.id} />}
              <input type="hidden" name="type" value={formType} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Nominal (Rupiah)<input className="field mt-1.5" name="amount" inputMode="numeric" type="number" min="1" step="1" defaultValue={selectedTransaction?.amount} placeholder="0" required /></label>
                <label className="text-sm font-semibold">Tanggal<input className="field mt-1.5" name="date" type="date" defaultValue={selectedTransaction?.date ?? getJakartaDate()} required /></label>
                <label className="text-sm font-semibold">Akun {formType === "income" ? "tujuan" : "sumber"}
                  <select className="field mt-1.5" name="accountId" defaultValue={selectedTransaction?.account_id} required>
                    {formAccounts.map((account) => <option key={account.account_id} value={account.account_id}>{account.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold">Kategori
                  <select className="field mt-1.5" name="categoryId" defaultValue={selectedTransaction?.category_id} required>
                    {formCategories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.category_group === "non_income" ? " · Non-pendapatan" : ""}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold sm:col-span-2">Catatan (opsional)<input className="field mt-1.5" name="note" defaultValue={selectedTransaction?.note ?? ""} maxLength={500} placeholder={formType === "expense" ? "Contoh: makan siang" : "Contoh: gaji November"} /></label>
              </div>
              {formType === "income" && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">Pemasukan hanya masuk ke akun aset. Untuk pembayaran atau pencairan utang, gunakan tab Transfer.</p>}
              <button className="button-primary" type="submit">{selectedTransaction ? "Simpan perubahan" : "Simpan transaksi"}</button>
            </form>
          </>}
        </div>
      </section>

      {activeMode === "transfer" ? <>
        <section className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="section-label">Perpindahan uang</p><h2 className="mt-1 text-xl font-bold">Transfer terakhir</h2></div><ArrowLeftRight className="text-emerald-700 dark:text-emerald-400" size={20} /></div>
          {transfers.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Belum ada transfer.</p> : <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{transfers.map((transfer) => <div key={transfer.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{accountById.get(transfer.from_account_id)?.name ?? "Akun asal"} <span className="text-slate-400">→</span> {accountById.get(transfer.to_account_id)?.name ?? "Akun tujuan"}</p><p className="mt-1 text-xs text-slate-500">{transfer.date}{Number(transfer.fee) > 0 ? ` · Biaya ${formatRupiah(Number(transfer.fee))}` : ""}</p></div><div className="flex items-center gap-2"><span className="mr-2 font-bold tabular-nums">{formatRupiah(Number(transfer.amount))}</span><Link href={`/transactions?mode=transfer&edit=${transfer.id}`} className="button-secondary min-h-9 px-2.5" aria-label="Ubah transfer"><Pencil size={15} /></Link><form action={softDeleteTransferAction}><input type="hidden" name="id" value={transfer.id} /><button className="button-danger" type="submit" aria-label="Hapus transfer"><Trash2 size={15} /></button></form></div></div>)}</div>}
        </section>
        {deletedTransfers.length > 0 && <section className="surface p-5 sm:p-6"><h2 className="text-lg font-bold">Transfer yang dihapus</h2><div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{deletedTransfers.map((transfer) => <div key={transfer.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><p className="text-sm text-slate-600 dark:text-slate-300">{accountById.get(transfer.from_account_id)?.name ?? "Akun"} → {accountById.get(transfer.to_account_id)?.name ?? "Akun"} · {formatRupiah(Number(transfer.amount))}</p><form action={restoreTransferAction}><input type="hidden" name="id" value={transfer.id} /><button className="button-secondary min-h-9" type="submit"><RotateCcw size={15} />Pulihkan</button></form></div>)}</div></section>}
      </> : <section className="surface p-5 sm:p-6">
        <div><p className="section-label">Riwayat</p><h2 className="mt-1 text-xl font-bold">Transaksi terakhir</h2></div>
        {transactions.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Belum ada transaksi untuk ditampilkan.</p> : <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{transactions.map((transaction) => {
          const category = transaction.categories as unknown as { name?: string } | null;
          const account = accountById.get(transaction.account_id);
          const isIncome = transaction.type === "income";
          return <div key={transaction.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className={`rounded-lg p-2 ${isIncome ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800"}`}>{isIncome ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}</span><div><p className="font-semibold">{category?.name ?? "Transaksi"} <span className="font-normal text-slate-400">· {account?.name ?? "Akun"}</span></p><p className="mt-0.5 text-xs text-slate-500">{transaction.date}{transaction.note ? ` · ${transaction.note}` : ""}</p></div></div><div className="flex items-center justify-between gap-2 sm:justify-end"><span className={`font-bold tabular-nums ${isIncome ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{isIncome ? "+" : "−"}{formatRupiah(Number(transaction.amount))}</span><Link href={`/transactions?mode=${transaction.type}&edit=${transaction.id}`} className="button-secondary min-h-9 px-2.5" aria-label="Ubah transaksi"><Pencil size={15} /></Link><form action={softDeleteTransactionAction}><input type="hidden" name="id" value={transaction.id} /><button className="button-danger" type="submit" aria-label="Hapus transaksi"><Trash2 size={15} /></button></form></div></div>;
        })}</div>}
      </section>}
    </div>
  );
}

function ModeLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} role="tab" aria-selected={active} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${active ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{children}</Link>;
}
