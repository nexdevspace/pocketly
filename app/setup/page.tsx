import Link from "next/link";
import { Brand } from "@/components/brand";

export default function SetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="surface w-full max-w-xl p-7 sm:p-10">
        <Brand />
        <p className="section-label mt-10">Persiapan pertama</p>
        <h1 className="mt-2 text-2xl font-bold">Hubungkan Pocketly ke Supabase</h1>
        <p className="mt-3 leading-7 text-slate-500">
          Buat proyek Supabase, salin <code>.env.example</code> menjadi <code>.env.local</code>, lalu isi URL dan publishable key dari proyek Anda.
        </p>
        <pre className="mt-5 overflow-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-emerald-200">NEXT_PUBLIC_SUPABASE_URL=…{"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…</pre>
        <p className="mt-5 leading-7 text-slate-500">
          Setelah itu jalankan migrasi <code>supabase/migrations</code> memakai Supabase CLI atau SQL Editor, kemudian muat ulang halaman.
        </p>
        <Link href="/login" className="button-primary mt-6">Lanjut ke masuk</Link>
      </section>
    </main>
  );
}
