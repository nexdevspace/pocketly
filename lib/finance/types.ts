export type AccountKind = "asset" | "liability";

export type AccountType =
  | "bank"
  | "ewallet"
  | "cash"
  | "investment"
  | "receivable"
  | "paylater"
  | "loan"
  | "payable";

export type TransactionType = "income" | "expense";

export interface BalanceAccount {
  id: string;
  kind: AccountKind;
  type: AccountType;
  openingBalance: number;
}

export interface BalanceTransaction {
  accountId: string;
  type: TransactionType;
  amount: number;
  deletedAt?: string | null;
}

export interface BalanceTransfer {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  deletedAt?: string | null;
}

export interface BalanceAdjustment {
  accountId: string;
  amountDelta: number;
  deletedAt?: string | null;
}

export interface AccountBalance {
  accountId: string;
  kind: AccountKind;
  type: AccountType;
  balance: number;
}

/** Raw row shape returned by the Supabase wallet_balances view (database snake_case). */
export interface WalletBalanceRow {
  account_id: string;
  user_id: string;
  kind: AccountKind;
  type: AccountType;
  name: string;
  institution: string | null;
  counterparty_name: string | null;
  opening_balance: number;
  opening_date: string;
  credit_limit: number | null;
  due_day: number | null;
  is_default: boolean;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  balance: number;
}
