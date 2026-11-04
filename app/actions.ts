"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAccountKind } from "@/lib/accounts/presets";
import { LIABILITY_INCOME_ERROR, transactionSchema, transferSchema } from "@/lib/finance/validation";
import { getJakartaDate } from "@/lib/finance/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email("Masukkan alamat email yang valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

function actionError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const TRANSFER_FEE_EDIT_ERROR = "Biaya diatur lewat transfernya";

function transactionWriteError(message: string | undefined, fallback: string) {
  if (message === LIABILITY_INCOME_ERROR) return LIABILITY_INCOME_ERROR;
  if (
    message?.includes(TRANSFER_FEE_EDIT_ERROR) ||
    message?.includes("Biaya transfer hanya dapat diubah")
  ) {
    return TRANSFER_FEE_EDIT_ERROR;
  }
  return fallback;
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signInAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) actionError("/login", parsed.error.issues[0]?.message ?? "Periksa data masuk.");
  if (!isSupabaseConfigured()) {
    actionError("/login", "Hubungkan proyek Supabase dengan mengisi .env.local terlebih dahulu.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) actionError("/login", "Email atau kata sandi tidak cocok.");
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) actionError("/signup", parsed.error.issues[0]?.message ?? "Periksa data pendaftaran.");
  if (!isSupabaseConfigured()) {
    actionError("/signup", "Hubungkan proyek Supabase dengan mengisi .env.local terlebih dahulu.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/onboarding`,
    },
  });
  if (error) actionError("/signup", "Pendaftaran gagal. Coba gunakan email lain.");
  redirect("/login?message=Periksa email untuk memverifikasi akun.");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = z.email().safeParse(text(formData, "email"));
  if (!email.success) actionError("/forgot-password", "Masukkan alamat email yang valid.");
  if (!isSupabaseConfigured()) {
    actionError("/forgot-password", "Hubungkan proyek Supabase dengan mengisi .env.local terlebih dahulu.");
  }

  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) actionError("/forgot-password", "Email pemulihan belum dapat dikirim. Coba lagi nanti.");
  redirect("/forgot-password?message=Jika email terdaftar, tautan pemulihan akan dikirim.");
}

export async function updatePasswordAction(formData: FormData) {
  const password = z.string().min(8).safeParse(text(formData, "password"));
  if (!password.success) actionError("/reset-password", "Kata sandi minimal 8 karakter.");
  if (!isSupabaseConfigured()) actionError("/reset-password", "Supabase belum dikonfigurasi.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) actionError("/reset-password", "Kata sandi belum dapat diperbarui. Buka tautan pemulihan terbaru.");
  redirect("/login?message=Kata sandi berhasil diperbarui.");
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

const accountInputSchema = z.object({
  type: z.enum(["bank", "ewallet", "cash", "investment", "receivable", "paylater", "loan", "payable"]),
  name: z.string().trim().min(1, "Nama akun wajib diisi.").max(80),
  institution: z.string().trim().max(80).optional(),
  counterpartyName: z.string().trim().max(80).optional(),
  openingBalance: z.coerce.number().int().min(0, "Saldo tidak boleh negatif."),
  openingDate: z.iso.date(),
  creditLimit: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional(),
  dueDay: z.union([z.literal(""), z.coerce.number().int().min(1).max(31)]).optional(),
});

export async function createAccountAction(formData: FormData) {
  const parsed = accountInputSchema.safeParse({
    type: text(formData, "type"),
    name: text(formData, "name"),
    institution: text(formData, "institution"),
    counterpartyName: text(formData, "counterpartyName"),
    openingBalance: text(formData, "openingBalance"),
    openingDate: text(formData, "openingDate") || getJakartaDate(),
    creditLimit: text(formData, "creditLimit"),
    dueDay: text(formData, "dueDay"),
  });
  if (!parsed.success) actionError("/accounts", parsed.error.issues[0]?.message ?? "Data akun belum valid.");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    kind: getAccountKind(parsed.data.type),
    type: parsed.data.type,
    name: parsed.data.name,
    institution: parsed.data.institution || null,
    counterparty_name: parsed.data.counterpartyName || null,
    opening_balance: parsed.data.openingBalance,
    opening_date: parsed.data.openingDate,
    credit_limit: parsed.data.creditLimit === "" ? null : parsed.data.creditLimit,
    due_day: parsed.data.dueDay === "" ? null : parsed.data.dueDay,
  });
  if (error) actionError("/accounts", "Akun belum dapat disimpan. Periksa jenis, nama, dan tanggal saldo.");
  redirect("/accounts?message=Akun berhasil ditambahkan.");
}

export async function changeOpeningBalanceAction(formData: FormData) {
  const accountId = z.string().uuid().safeParse(text(formData, "accountId"));
  const newBalance = z.coerce.number().int().min(0).safeParse(text(formData, "openingBalance"));
  if (!accountId.success || !newBalance.success) actionError("/accounts", "Saldo awal tidak valid.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_opening_balance_change", {
    p_account_id: accountId.data,
    p_new_opening_balance: newBalance.data,
  });
  if (error) actionError("/accounts", "Saldo awal belum dapat diperbarui. Pastikan akun masih tersedia.");
  redirect("/accounts?message=Saldo awal diperbarui dan riwayat penyesuaian tersimpan.");
}

export async function completeOnboardingAction(formData: FormData) {
  const startDate = z.iso.date().safeParse(text(formData, "startDate"));
  let accounts: unknown;
  try {
    accounts = JSON.parse(text(formData, "accounts"));
  } catch {
    actionError("/onboarding", "Data akun belum valid.");
  }
  const accountList = z.array(accountInputSchema).min(1).safeParse(accounts);
  if (!startDate.success || !accountList.success) {
    actionError("/onboarding", "Tambahkan minimal satu akun aset dengan data yang valid.");
  }
  if (!accountList.data.some((account) => getAccountKind(account.type) === "asset")) {
    actionError("/onboarding", "Tambahkan minimal satu akun aset untuk melanjutkan.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_start_date: startDate.data,
    p_accounts: accountList.data.map((account, index) => ({
      kind: getAccountKind(account.type),
      type: account.type,
      name: account.name,
      institution: account.institution || null,
      counterparty_name: account.counterpartyName || null,
      opening_balance: account.openingBalance,
      credit_limit: account.creditLimit === "" ? null : account.creditLimit,
      due_day: account.dueDay === "" ? null : account.dueDay,
      is_default: index === 0 && getAccountKind(account.type) === "asset",
    })),
  });
  if (error) actionError("/onboarding", "Onboarding belum dapat disimpan. Periksa data akun dan pastikan ada satu akun aset.");
  redirect("/dashboard");
}

export async function saveTransactionAction(formData: FormData) {
  const transactionId = text(formData, "transactionId");
  const parsed = transactionSchema.safeParse({
    type: text(formData, "type"),
    accountId: text(formData, "accountId"),
    categoryId: text(formData, "categoryId"),
    amount: text(formData, "amount"),
    date: text(formData, "date") || getJakartaDate(),
    note: text(formData, "note"),
  });
  if (!parsed.success) actionError("/transactions", parsed.error.issues[0]?.message ?? "Transaksi belum valid.");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const values = {
    user_id: user.id,
    type: parsed.data.type,
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId,
    amount: parsed.data.amount,
    date: parsed.data.date,
    note: parsed.data.note || null,
    source: "web",
    transfer_id: null,
  };
  const saveError = "Transaksi belum dapat disimpan. Periksa akun, kategori, nominal, dan tanggalnya.";
  if (transactionId) {
    const { data: existing, error: lookupError } = await supabase
      .from("transactions")
      .select("transfer_id")
      .eq("user_id", user.id)
      .eq("id", transactionId)
      .maybeSingle();
    if (lookupError) actionError("/transactions", saveError);
    if (!existing) actionError("/transactions", "Transaksi tidak ditemukan.");
    if (existing.transfer_id) actionError("/transactions", TRANSFER_FEE_EDIT_ERROR);

    const { data, error } = await supabase
      .from("transactions")
      .update(values)
      .eq("user_id", user.id)
      .eq("id", transactionId)
      .is("transfer_id", null)
      .select("id")
      .maybeSingle();
    if (error) actionError("/transactions", transactionWriteError(error.message, saveError));
    if (!data) actionError("/transactions", "Transaksi tidak ditemukan atau tidak dapat diubah.");
  } else {
    const { error } = await supabase.from("transactions").insert(values);
    if (error) actionError("/transactions", transactionWriteError(error.message, saveError));
  }
  redirect("/transactions?message=Transaksi berhasil disimpan.");
}

export async function softDeleteTransactionAction(formData: FormData) {
  const id = z.string().uuid().safeParse(text(formData, "id"));
  if (!id.success) actionError("/transactions", "Transaksi tidak ditemukan.");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: existing, error: lookupError } = await supabase
    .from("transactions")
    .select("transfer_id")
    .eq("user_id", user.id)
    .eq("id", id.data)
    .maybeSingle();
  if (lookupError) actionError("/transactions", "Transaksi belum dapat dihapus. Muat ulang lalu coba lagi.");
  if (!existing) actionError("/transactions", "Transaksi tidak ditemukan.");
  if (existing.transfer_id) actionError("/transactions", TRANSFER_FEE_EDIT_ERROR);
  const { data, error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id.data)
    .is("transfer_id", null)
    .select("id")
    .maybeSingle();
  if (error) actionError("/transactions", transactionWriteError(error.message, "Transaksi belum dapat dihapus. Muat ulang lalu coba lagi."));
  if (!data) actionError("/transactions", "Transaksi tidak ditemukan atau tidak dapat dihapus.");
  redirect("/transactions?message=Transaksi dipindahkan ke riwayat hapus.");
}

export async function saveTransferAction(formData: FormData) {
  const transferId = text(formData, "transferId");
  const parsed = transferSchema.safeParse({
    fromAccountId: text(formData, "fromAccountId"),
    toAccountId: text(formData, "toAccountId"),
    amount: text(formData, "amount"),
    fee: text(formData, "fee") || "0",
    date: text(formData, "date") || getJakartaDate(),
  });
  if (!parsed.success) actionError("/transactions?mode=transfer", parsed.error.issues[0]?.message ?? "Transfer belum valid.");

  const supabase = await createSupabaseServerClient();
  const rpcName = transferId ? "update_transfer" : "create_transfer";
  const rpcArgs = transferId
    ? {
        p_transfer_id: transferId,
        p_from_account_id: parsed.data.fromAccountId,
        p_to_account_id: parsed.data.toAccountId,
        p_amount: parsed.data.amount,
        p_fee: parsed.data.fee,
        p_date: parsed.data.date,
      }
    : {
        p_from_account_id: parsed.data.fromAccountId,
        p_to_account_id: parsed.data.toAccountId,
        p_amount: parsed.data.amount,
        p_fee: parsed.data.fee,
        p_date: parsed.data.date,
      };
  const { error } = await supabase.rpc(rpcName, rpcArgs);
  if (error) actionError("/transactions?mode=transfer", "Transfer belum dapat disimpan. Periksa akun, nominal, tanggal, dan biaya.");
  redirect("/transactions?message=Transfer dan biaya terkait berhasil disimpan.");
}

export async function softDeleteTransferAction(formData: FormData) {
  const id = z.string().uuid().safeParse(text(formData, "id"));
  if (!id.success) actionError("/transactions", "Transfer tidak ditemukan.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("soft_delete_transfer", { p_transfer_id: id.data });
  if (error) actionError("/transactions", "Transfer belum dapat dihapus. Muat ulang lalu coba lagi.");
  redirect("/transactions?message=Transfer dan biaya terkait dihapus bersama.");
}

export async function restoreTransferAction(formData: FormData) {
  const id = z.string().uuid().safeParse(text(formData, "id"));
  if (!id.success) actionError("/transactions", "Transfer tidak ditemukan.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("restore_transfer", { p_transfer_id: id.data });
  if (error) actionError("/transactions", "Transfer belum dapat dipulihkan. Muat ulang lalu coba lagi.");
  redirect("/transactions?message=Transfer dan biaya terkait dipulihkan.");
}
