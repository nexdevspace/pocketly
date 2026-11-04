import Link from "next/link";
import { signUpAction } from "@/app/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <section className="surface p-6 sm:p-8">
      <p className="section-label">Mulai lebih teratur</p>
      <h1 className="mt-2 text-2xl font-bold">Buat akun Pocketly</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Semua data keuangan Anda bersifat pribadi dan terlindungi.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      <form action={signUpAction} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Email<input className="field mt-1.5" type="email" name="email" autoComplete="email" required /></label>
        <label className="block text-sm font-semibold">Kata sandi<input className="field mt-1.5" type="password" name="password" autoComplete="new-password" required minLength={8} /></label>
        <button className="button-primary w-full" type="submit">Daftar</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Sudah punya akun? <Link className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400" href="/login">Masuk</Link></p>
    </section>
  );
}
