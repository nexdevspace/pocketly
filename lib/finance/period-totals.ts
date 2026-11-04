import type { TransactionType } from "./types";

export interface PeriodTransaction {
  type: TransactionType;
  amount: number;
  date: string;
  categoryName?: string;
  categoryGroup: "income_group" | "non_income" | null;
  deletedAt?: string | null;
}

export interface PeriodAdjustment {
  amountDelta: number;
  effectiveDate: string;
}

/**
 * Month totals are ledger transaction totals. Balance adjustments are accepted
 * for call-site clarity but are intentionally excluded from income and expenses.
 */
export function getPeriodTotals({
  transactions,
  adjustments = [],
  fromDate,
  toDate,
}: {
  transactions: PeriodTransaction[];
  adjustments?: PeriodAdjustment[];
  fromDate: string;
  toDate: string;
}) {
  void adjustments;
  const period = transactions.filter(
    (transaction) =>
      !transaction.deletedAt &&
      transaction.date >= fromDate &&
      transaction.date <= toDate,
  );
  const sum = (predicate: (transaction: PeriodTransaction) => boolean) =>
    period
      .filter(predicate)
      .reduce((total, transaction) => total + transaction.amount, 0);

  return {
    income: sum(
      (transaction) =>
        transaction.type === "income" && transaction.categoryGroup === "income_group",
    ),
    nonIncome: sum(
      (transaction) =>
        transaction.type === "income" && transaction.categoryGroup === "non_income",
    ),
    expenses: sum((transaction) => transaction.type === "expense"),
  };
}
