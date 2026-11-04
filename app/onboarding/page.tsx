import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getJakartaDate } from "@/lib/finance/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!isSupabaseConfigured()) redirect("/setup");
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, start_date")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 sm:py-12">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between"><span className="font-extrabold tracking-tight">Pocketly</span><span className="text-sm text-slate-500">Langkah awal, sekitar 2 menit</span></div>
      {error && <p role="alert" className="mx-auto mb-4 max-w-3xl rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <OnboardingWizard initialDate={profile?.start_date ?? getJakartaDate()} />
    </main>
  );
}
