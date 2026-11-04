import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return (
    <section className="surface p-6 sm:p-8">
      <p className="section-label">Pemulihan akun</p>
      <h1 className="mt-2 text-2xl font-bold">Atur ulang kata sandi</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Kami akan mengirim tautan pemulihan ke email yang terdaftar.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <form action={requestPasswordResetAction} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Email<input className="field mt-1.5" type="email" name="email" autoComplete="email" required /></label>
        <button className="button-primary w-full" type="submit">Kirim tautan</button>
      </form>
      <p className="mt-5 text-center text-sm"><Link href="/login" className="font-semibold text-emerald-700 hover:underline">Kembali ke masuk</Link></p>
    </section>
  );
}
