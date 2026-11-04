import { describe, expect, it } from "vitest";
import {
  computeAccountBalances,
  getDashboardTotals,
} from "./balances";
import { validateIncomeAccount, LIABILITY_INCOME_ERROR } from "./validation";
import type { BalanceAccount } from "./types";

const accounts: BalanceAccount[] = [
  { id: "bca", kind: "asset", type: "bank", openingBalance: 1_000_000 },
  { id: "cash", kind: "asset", type: "cash", openingBalance: 50_000 },
  { id: "loan", kind: "liability", type: "paylater", openingBalance: 0 },
  { id: "receivable", kind: "asset", type: "receivable", openingBalance: 0 },
  { id: "fund", kind: "asset", type: "investment", openingBalance: 0 },
];

describe("account balances", () => {
  it("counts a transfer fee exactly once as an expense on the source account", () => {
    const balances = computeAccountBalances({
      accounts: accounts.slice(0, 2),
      transactions: [
        { accountId: "bca", type: "expense", amount: 2_500 },
      ],
      transfers: [{ fromAccountId: "bca", toAccountId: "cash", amount: 200_000 }],
    });

    expect(balances.find((item) => item.accountId === "bca")?.balance).toBe(
      797_500,
    );
    expect(balances.find((item) => item.accountId === "cash")?.balance).toBe(
      250_000,
    );
  });

  it("changes source balance by only the fee difference when the fee is edited", () => {
    const before = computeAccountBalances({
      accounts: accounts.slice(0, 2),
      transactions: [{ accountId: "bca", type: "expense", amount: 2_500 }],
      transfers: [{ fromAccountId: "bca", toAccountId: "cash", amount: 200_000 }],
    });
    const after = computeAccountBalances({
      accounts: accounts.slice(0, 2),
      transactions: [{ accountId: "bca", type: "expense", amount: 3_000 }],
      transfers: [{ fromAccountId: "bca", toAccountId: "cash", amount: 200_000 }],
    });

    expect(
      before.find((item) => item.accountId === "bca")!.balance -
        after.find((item) => item.accountId === "bca")!.balance,
    ).toBe(500);
  });

  it("restores source and destination balances when a transfer is deleted or restored", () => {
    const activeTransfer = {
      fromAccountId: "bca",
      toAccountId: "cash",
      amount: 200_000,
    };
    const fee = { accountId: "bca", type: "expense" as const, amount: 2_500 };
    const active = computeAccountBalances({
      accounts: accounts.slice(0, 2),
      transactions: [fee],
      transfers: [activeTransfer],
    });
    const deleted = computeAccountBalances({
      accounts: accounts.slice(0, 2),
      transactions: [{ ...fee, deletedAt: "2026-11-01T00:00:00Z" }],
      transfers: [{ ...activeTransfer, deletedAt: "2026-11-01T00:00:00Z" }],
    });
    const restored = computeAccountBalances({
      accounts: accounts.slice(0, 2),
      transactions: [fee],
      transfers: [activeTransfer],
    });

    expect(deleted.map((item) => item.balance)).toEqual([1_000_000, 50_000]);
    expect(restored).toEqual(active);
  });

  it("increases both the asset and liability equally when a loan is disbursed", () => {
    const before = computeAccountBalances({
      accounts: [accounts[0], accounts[2]],
      transactions: [],
      transfers: [],
    });
    const balances = computeAccountBalances({
      accounts: [accounts[0], accounts[2]],
      transactions: [],
      transfers: [{ fromAccountId: "loan", toAccountId: "bca", amount: 1_000_000 }],
    });

    expect(balances.map((item) => item.balance)).toEqual([2_000_000, 1_000_000]);
    expect(getDashboardTotals(balances).netWorth).toBe(getDashboardTotals(before).netWorth);
  });

  it("counts adjustments in balances without turning them into transactions", () => {
    const balances = computeAccountBalances({
      accounts: [accounts[0]],
      transactions: [],
      transfers: [],
      adjustments: [{ accountId: "bca", amountDelta: -25_000 }],
    });

    expect(balances[0].balance).toBe(975_000);
  });

  it("allows same-user asset income and explains that liability income must be a transfer", () => {
    expect(validateIncomeAccount("income", "asset")).toEqual({ ok: true });
    expect(validateIncomeAccount("income", "liability")).toEqual({
      ok: false,
      error: LIABILITY_INCOME_ERROR,
    });
    expect(validateIncomeAccount("expense", "liability")).toEqual({ ok: true });
  });
});
