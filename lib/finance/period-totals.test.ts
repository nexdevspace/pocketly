import { describe, expect, it } from "vitest";
import { getPeriodTotals } from "./period-totals";

describe("period totals", () => {
  it("keeps balance adjustments out of income and expenses while counting Tak tercatat transactions", () => {
    const totals = getPeriodTotals({
      fromDate: "2026-11-01",
      toDate: "2026-11-30",
      transactions: [
        { type: "income", amount: 5_000_000, date: "2026-11-01", categoryGroup: "income_group" },
        { type: "income", amount: 100_000, date: "2026-11-02", categoryGroup: "non_income" },
        { type: "expense", amount: 25_000, date: "2026-11-03", categoryName: "Tak tercatat", categoryGroup: null },
      ],
      adjustments: [{ amountDelta: 700_000, effectiveDate: "2026-11-01" }],
    });

    expect(totals).toEqual({ income: 5_000_000, nonIncome: 100_000, expenses: 25_000 });
  });
});
