"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { formatRupiah, getJakartaDate } from "@/lib/finance/format";

export interface TransferAccountOption {
  id: string;
  name: string;
  kind: string;
  type: string;
  balance: number;
}

export function TransferForm({
  accounts,
  action,
  transfer,
}: {
  accounts: TransferAccountOption[];
  action: (formData: FormData) => void | Promise<void>;
  transfer?: { id: string; from_account_id: string; to_account_id: string; amount: number; fee: number; date: string };
}) {
  const [fromId, setFromId] = useState(transfer?.from_account_id ?? accounts[0]?.id ?? "");
  const [toId, setToId] = useState(transfer?.to_account_id ?? accounts.find((account) => account.id !== fromId)?.id ?? "");
  const [amount, setAmount] = useState(String(transfer?.amount ?? ""));
  const [fee, setFee] = useState(String(transfer?.fee ?? "0"));
  const fromAccount = useMemo(() => accounts.find((account) => account.id === fromId), [accounts, fromId]);
  const total = (Number(amount) || 0) + (Number(fee) || 0);
  const insufficient = fromAccount?.kind === "asset" && total > fromAccount.balance;

  return (
    <form action={action} className="space-y-4">
      {transfer && <input type="hidden" name="transferId" value={transfer.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Dari akun
          <select className="field mt-1.5" name="fromAccountId" value={fromId} onChange={(event) => { setFromId(event.target.value); if (event.target.value === toId) setToId(accounts.find((account) => account.id !== event.target.value)?.id ?? ""); }} required>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatRupiah(account.balance)}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Ke akun
          <select className="field mt-1.5" name="toAccountId" value={toId} onChange={(event) => setToId(event.target.value)} required>
            {accounts.filter((account) => account.id !== fromId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Nominal transfer (Rupiah)
          <input className="field mt-1.5" type="number" inputMode="numeric" min="1" step="1" name="amount" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </label>
        <label className="text-sm font-semibold">Biaya / bunga (Rupiah)
          <input className="field mt-1.5" type="number" inputMode="numeric" min="0" step="1" name="fee" value={fee} onChange={(event) => setFee(event.target.value)} required />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Tanggal
          <input className="field mt-1.5" type="date" name="date" defaultValue={transfer?.date ?? getJakartaDate()} required />
        </label>
      </div>
      {insufficient && <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-200"><AlertTriangle size={18} className="mt-0.5 shrink-0" />Saldo asal lebih kecil dari total transfer dan biaya ({formatRupiah(total)}). Transfer tetap boleh dilanjutkan; saldo akun bisa menjadi negatif.</p>}
      <p className="text-xs leading-5 text-slate-500">Biaya dicatat sebagai pengeluaran di akun asal dan akan ikut berubah bersama transfer.</p>
      <button className="button-primary" type="submit"><ArrowLeftRight size={17} />{transfer ? "Simpan perubahan" : "Simpan transfer"}</button>
    </form>
  );
}
