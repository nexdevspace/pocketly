"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Wallet } from "lucide-react";
import { completeOnboardingAction } from "@/app/actions";
import { BANK_PRESETS, EWALLET_PRESETS, ACCOUNT_TYPE_LABELS, getAccountKind } from "@/lib/accounts/presets";
import { formatRupiah, getJakartaDate } from "@/lib/finance/format";

type AccountType = "bank" | "ewallet" | "cash" | "investment" | "receivable" | "paylater" | "loan" | "payable";
type AccountDraft = {
  name: string;
  type: AccountType;
  institution: string;
  counterpartyName: string;
  openingBalance: number;
  openingDate: string;
  creditLimit: "" | number;
  dueDay: "" | number;
};

const steps = ["Bank", "E-wallet", "Tunai", "Utang & piutang", "Review"];
const stepDefaults: AccountDraft[] = [
  { name: "BCA", type: "bank", institution: "BCA", counterpartyName: "", openingBalance: 0, openingDate: getJakartaDate(), creditLimit: "", dueDay: "" },
  { name: "GoPay", type: "ewallet", institution: "GoPay", counterpartyName: "", openingBalance: 0, openingDate: getJakartaDate(), creditLimit: "", dueDay: "" },
  { name: "Dompet utama", type: "cash", institution: "", counterpartyName: "", openingBalance: 0, openingDate: getJakartaDate(), creditLimit: "", dueDay: "" },
  { name: "SPayLater", type: "paylater", institution: "", counterpartyName: "", openingBalance: 0, openingDate: getJakartaDate(), creditLimit: "", dueDay: "" },
];

export function OnboardingWizard({ initialDate }: { initialDate: string }) {
  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState(initialDate);
  const [accounts, setAccounts] = useState<AccountDraft[]>([]);
  const [draft, setDraft] = useState<AccountDraft>({ ...stepDefaults[0], openingDate: initialDate });
  const [error, setError] = useState("");
  const assets = useMemo(() => accounts.filter((account) => getAccountKind(account.type) === "asset"), [accounts]);
  const availableBanks = useMemo(() => [...BANK_PRESETS], []);
  const availableWallets = useMemo(() => [...EWALLET_PRESETS], []);

  function moveTo(next: number) {
    setStep(next);
    const fallback = stepDefaults[Math.min(next, 3)] ?? stepDefaults[3];
    setDraft({ ...fallback, openingDate: startDate });
    setError("");
  }

  function addAccount() {
    if (!draft.name.trim()) {
      setError("Nama akun wajib diisi.");
      return;
    }
    if ((draft.type === "receivable" || draft.type === "payable") && !draft.counterpartyName.trim()) {
      setError("Isi nama orang atau pihak terkait.");
      return;
    }
    setAccounts((current) => [...current, { ...draft, name: draft.name.trim(), openingDate: startDate }]);
    const fallback = stepDefaults[Math.min(step, 3)] ?? stepDefaults[3];
    setDraft({ ...fallback, openingDate: startDate });
    setError("");
  }

  const readyMoney = accounts
    .filter((account) => ["bank", "ewallet", "cash"].includes(account.type))
    .reduce((sum, account) => sum + account.openingBalance, 0);
  const otherAssets = accounts
    .filter((account) => ["investment", "receivable"].includes(account.type))
    .reduce((sum, account) => sum + account.openingBalance, 0);
  const liabilities = accounts
    .filter((account) => getAccountKind(account.type) === "liability")
    .reduce((sum, account) => sum + account.openingBalance, 0);

  return (
    <section className="surface mx-auto w-full max-w-3xl p-5 sm:p-8">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="section-label">Langkah {step + 1} dari 5</p>
          <h1 className="mt-1 text-2xl font-bold">Siapkan kantong uangmu</h1>
        </div>
        <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Wallet size={22} /></span>
      </div>
      <div className="mb-8 grid grid-cols-5 gap-1.5" aria-label="Progres onboarding">
        {steps.map((label, index) => (
          <div key={label}>
            <div className={`h-1.5 rounded-full ${index <= step ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"}`} />
            <span className={`mt-2 hidden text-xs sm:block ${index === step ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>{label}</span>
          </div>
        ))}
      </div>

      {step < 4 ? (
        <div>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">{steps[step]}</h2>
              <p className="mt-1 text-sm text-slate-500">Tambahkan satu atau beberapa akun, atau lewati langkah ini.</p>
            </div>
            <button type="button" onClick={() => moveTo(step + 1)} className="text-sm font-semibold text-slate-500 hover:text-emerald-700">Lewati</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {step === 0 && <label className="text-sm font-semibold">Pilih bank
              <select className="field mt-1.5" value={draft.institution} onChange={(event) => setDraft({ ...draft, institution: event.target.value, name: event.target.value === "Lainnya" ? "" : event.target.value })}>
                {availableBanks.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>}
            {step === 1 && <label className="text-sm font-semibold">Pilih e-wallet
              <select className="field mt-1.5" value={draft.institution} onChange={(event) => setDraft({ ...draft, institution: event.target.value, name: event.target.value === "Lainnya" ? "" : event.target.value })}>
                {availableWallets.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>}
            {step === 2 && <label className="text-sm font-semibold">Nama tempat menyimpan tunai
              <input className="field mt-1.5" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Dompet utama" />
            </label>}
            {step === 3 && <label className="text-sm font-semibold">Jenis akun
              <select className="field mt-1.5" value={draft.type} onChange={(event) => {
                const type = event.target.value as AccountType;
                setDraft({ ...draft, type, name: type === "paylater" ? "SPayLater" : type === "receivable" ? "Piutang baru" : type === "payable" ? "Utang baru" : "Pinjaman baru" });
              }}>
                <option value="paylater">Paylater</option><option value="loan">Pinjaman</option><option value="payable">Utang ke orang</option><option value="receivable">Piutang</option>
              </select>
            </label>}
            {(step === 0 || step === 1 || step === 3) && <label className="text-sm font-semibold">Nama akun
              <input className="field mt-1.5" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={step === 0 ? "BCA" : step === 1 ? "GoPay" : "SPayLater"} />
            </label>}
            {step === 3 && (draft.type === "receivable" || draft.type === "payable") && <label className="text-sm font-semibold">Nama orang terkait
              <input className="field mt-1.5" value={draft.counterpartyName} onChange={(event) => setDraft({ ...draft, counterpartyName: event.target.value })} placeholder="Andi" />
            </label>}
            <label className="text-sm font-semibold">Saldo saat ini (Rupiah)
              <input className="field mt-1.5" inputMode="numeric" type="number" min="0" step="1" value={draft.openingBalance || ""} onChange={(event) => setDraft({ ...draft, openingBalance: Number(event.target.value) || 0 })} placeholder="0" />
            </label>
            {step === 3 && <>
              <label className="text-sm font-semibold">Limit (opsional)
                <input className="field mt-1.5" inputMode="numeric" type="number" min="0" step="1" value={draft.creditLimit} onChange={(event) => setDraft({ ...draft, creditLimit: event.target.value ? Number(event.target.value) : "" })} placeholder="Tanpa limit" />
              </label>
              <label className="text-sm font-semibold">Tanggal jatuh tempo (opsional)
                <input className="field mt-1.5" inputMode="numeric" type="number" min="1" max="31" value={draft.dueDay} onChange={(event) => setDraft({ ...draft, dueDay: event.target.value ? Number(event.target.value) : "" })} placeholder="Tanggal 1–31" />
              </label>
            </>}
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
          {accounts.filter((account) => account.type === stepDefaults[step]?.type || (step === 3 && getAccountKind(account.type) === "liability") || (step === 3 && account.type === "receivable")).length > 0 && (
            <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 dark:divide-slate-800 dark:border-slate-700">
              {accounts.filter((account) => account.type === stepDefaults[step]?.type || (step === 3 && ["paylater", "loan", "payable", "receivable"].includes(account.type))).map((account, index) => (
                <li key={`${account.name}-${index}`} className="flex items-center justify-between py-3 text-sm"><span>{account.name} <span className="text-slate-400">· {ACCOUNT_TYPE_LABELS[account.type]}</span></span><span className="font-semibold">{formatRupiah(account.openingBalance)}</span></li>
              ))}
            </ul>
          )}
          <div className="mt-7 flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <button type="button" onClick={addAccount} className="button-secondary"><Plus size={17} /> Tambah akun ini</button>
            <button type="button" onClick={() => moveTo(step + 1)} className="button-primary">Lanjut <ArrowRight size={17} /></button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold">Review saldo awal</h2>
          <p className="mt-1 text-sm text-slate-500">Semua saldo dianggap sebagai posisi pada tanggal mulai ini.</p>
          <label className="mt-5 block max-w-xs text-sm font-semibold">Tanggal mulai
            <input className="field mt-1.5" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </label>
          <div className="mt-5 space-y-2">
            {accounts.map((account, index) => <div key={`${account.name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900"><div><p className="font-semibold">{account.name}</p><p className="text-xs text-slate-500">{ACCOUNT_TYPE_LABELS[account.type]}</p></div><span className="font-bold tabular-nums">{formatRupiah(account.openingBalance)}</span></div>)}
            {accounts.length === 0 && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Belum ada akun. Kembali dan tambahkan setidaknya satu akun aset.</p>}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary label="Uang siap pakai" value={readyMoney} />
            <Summary label="Aset lain" value={otherAssets} />
            <Summary label="Utang" value={liabilities} />
            <Summary label="Kekayaan bersih" value={readyMoney + otherAssets - liabilities} />
          </div>
          <form action={completeOnboardingAction} className="mt-7">
            <input type="hidden" name="startDate" value={startDate} />
            <input type="hidden" name="accounts" value={JSON.stringify(accounts.map((account) => ({ ...account, openingDate: startDate })))} />
            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <button type="button" onClick={() => moveTo(3)} className="button-secondary"><ArrowLeft size={17} /> Kembali</button>
              <button type="submit" disabled={assets.length === 0} className="button-primary disabled:cursor-not-allowed disabled:opacity-50"><Check size={17} /> Mulai pakai Pocketly</button>
            </div>
          </form>
          {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
        </div>
      )}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold tabular-nums">{formatRupiah(value)}</p></div>;
}
