import Link from "next/link";
import { signInAction } from "@/app/actions";

type Search = Promise<{ error?: string; message?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const { error, message } = await searchParams;
  return (
    <section className="surface p-6 sm:p-8">
      <p className="section-label">Selamat datang kembali</p>
      <h1 className="mt-2 text-2xl font-bold">Masuk ke Pocketly</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Lihat semua dompet dan catatan uangmu di satu tempat.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
      <form action={signInAction} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Email<input className="field mt-1.5" type="email" name="email" autoComplete="email" required /></label>
        <label className="block text-sm font-semibold">Kata sandi<input className="field mt-1.5" type="password" name="password" autoComplete="current-password" required minLength={8} /></label>
        <button className="button-primary w-full" type="submit">Masuk</button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400" href="/forgot-password">Lupa kata sandi?</Link>
        <Link className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400" href="/signup">Buat akun</Link>
      </div>
    </section>
  );
}
