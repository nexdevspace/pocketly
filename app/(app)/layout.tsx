import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftRight, Download, LayoutDashboard, LogOut, Wallet } from "lucide-react";
import { Brand } from "@/components/brand";
import { signOutAction } from "@/app/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const navigation = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/accounts", label: "Dompet", icon: Wallet },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/export", label: "Data saya", icon: Download },
];

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) redirect("/setup");
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Brand compact />
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-slate-500 sm:inline">{user.email}</span>
            <form action={signOutAction}><button className="button-secondary min-h-10 px-3" type="submit" aria-label="Keluar"><LogOut size={17} /><span className="hidden sm:inline">Keluar</span></button></form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 sm:px-6 lg:px-8" aria-label="Navigasi utama">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"><Icon size={16} />{label}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">{children}</main>
    </div>
  );
}
