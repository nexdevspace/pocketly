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
