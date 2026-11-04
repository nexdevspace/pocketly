import Link from "next/link";
import { updatePasswordAction } from "@/app/actions";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <section className="surface p-6 sm:p-8">
      <p className="section-label">Kata sandi baru</p>
      <h1 className="mt-2 text-2xl font-bold">Buat kata sandi baru</h1>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form action={updatePasswordAction} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Kata sandi baru<input className="field mt-1.5" type="password" name="password" autoComplete="new-password" required minLength={8} /></label>
        <button className="button-primary w-full" type="submit">Simpan kata sandi</button>
      </form>
      <p className="mt-5 text-center text-sm"><Link href="/login" className="font-semibold text-emerald-700 hover:underline">Kembali ke masuk</Link></p>
    </section>
  );
}
