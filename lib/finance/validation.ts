import { z } from "zod";
import type { AccountKind } from "./types";

export const rupiahAmountSchema = z.coerce
  .number({ message: "Masukkan nominal yang valid." })
  .int("Nominal harus berupa Rupiah bulat.")
  .positive("Nominal harus lebih dari Rp 0.");

export const transferSchema = z
  .object({
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    amount: rupiahAmountSchema,
    fee: z.coerce.number().int().min(0),
    date: z.iso.date(),
  })
  .refine((value) => value.fromAccountId !== value.toAccountId, {
    message: "Akun asal dan tujuan harus berbeda.",
    path: ["toAccountId"],
  });

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: rupiahAmountSchema,
  date: z.iso.date(),
  note: z.string().trim().max(500).optional(),
});

export const LIABILITY_INCOME_ERROR =
  "Pemasukan hanya dapat dicatat ke akun aset. Untuk pembayaran utang, gunakan Transfer.";

export function validateIncomeAccount(
  transactionType: "income" | "expense",
  accountKind: AccountKind,
) {
  if (transactionType === "income" && accountKind === "liability") {
    return { ok: false as const, error: LIABILITY_INCOME_ERROR };
  }

  return { ok: true as const };
}
