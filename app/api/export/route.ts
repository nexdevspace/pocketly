import { NextResponse } from "next/server";
import { getJakartaDate } from "@/lib/finance/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });

  const [profile, accounts, balances, categories, transactions, transfers, adjustments] = await Promise.all([
    supabase.from("profiles").select("id,onboarding_completed_at,start_date,created_at").eq("id", user.id).maybeSingle(),
    supabase.from("accounts").select("*").eq("user_id", user.id),
    supabase.from("wallet_balances").select("*").eq("user_id", user.id),
    supabase.from("categories").select("*").eq("user_id", user.id),
    supabase.from("transactions").select("*").eq("user_id", user.id),
    supabase.from("transfers").select("*").eq("user_id", user.id),
    supabase.from("account_balance_adjustments").select("*").eq("user_id", user.id),
  ]);

  const errors = [profile, accounts, balances, categories, transactions, transfers, adjustments].filter((result) => result.error);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Data belum dapat disiapkan. Coba lagi nanti." }, { status: 500 });
  }

  const payload = {
    product: "Pocketly",
    export_date: getJakartaDate(),
    user_id: user.id,
    data: {
      profile: profile.data,
      accounts: accounts.data,
      wallet_balances: balances.data,
      categories: categories.data,
      transactions: transactions.data,
      transfers: transfers.data,
      account_balance_adjustments: adjustments.data,
    },
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="pocketly-data-${getJakartaDate()}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
