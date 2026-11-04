import type {
  AccountBalance,
  BalanceAccount,
  BalanceAdjustment,
  BalanceTransaction,
  BalanceTransfer,
} from "./types";

/**
 * Rebuilds account balances from the ledger. Transfer fees belong in the
 * expense transaction list; the transfer's fee metadata is never summed here.
 */
export function computeAccountBalances({
  accounts,
  transactions,
  transfers,
  adjustments = [],
}: {
  accounts: BalanceAccount[];
  transactions: BalanceTransaction[];
  transfers: BalanceTransfer[];
  adjustments?: BalanceAdjustment[];
}): AccountBalance[] {
  return accounts.map((account) => {
    const accountTransactions = transactions.filter(
      (item) => item.accountId === account.id && !item.deletedAt,
    );
    const activeAdjustments = adjustments.filter(
      (item) => item.accountId === account.id && !item.deletedAt,
    );
    const incoming = transfers
      .filter((item) => item.toAccountId === account.id && !item.deletedAt)
      .reduce((total, item) => total + item.amount, 0);
    const outgoing = transfers
      .filter((item) => item.fromAccountId === account.id && !item.deletedAt)
      .reduce((total, item) => total + item.amount, 0);
    const income = accountTransactions
      .filter((item) => item.type === "income")
      .reduce((total, item) => total + item.amount, 0);
    const expense = accountTransactions
      .filter((item) => item.type === "expense")
      .reduce((total, item) => total + item.amount, 0);
    const adjustment = activeAdjustments.reduce(
      (total, item) => total + item.amountDelta,
      0,
    );

    const balance =
      account.kind === "asset"
        ? account.openingBalance + adjustment + income - expense + incoming - outgoing
        : account.openingBalance + adjustment + expense + outgoing - incoming;

    return {
      accountId: account.id,
      kind: account.kind,
      type: account.type,
      balance,
    };
  });
}

export function sumBalances(
  balances: AccountBalance[],
  predicate: (account: AccountBalance) => boolean,
): number {
  return balances
    .filter(predicate)
    .reduce((total, account) => total + account.balance, 0);
}

export function getDashboardTotals(balances: AccountBalance[]) {
  const readyTypes = new Set(["bank", "ewallet", "cash"]);
  const readyMoney = sumBalances(
    balances,
    (account) => account.kind === "asset" && readyTypes.has(account.type),
  );
  const otherAssets = sumBalances(
    balances,
    (account) =>
      account.kind === "asset" && !readyTypes.has(account.type),
  );
  const liabilities = sumBalances(
    balances,
    (account) => account.kind === "liability",
  );

  return {
    readyMoney,
    otherAssets,
    liabilities,
    netWorth: readyMoney + otherAssets - liabilities,
  };
}
