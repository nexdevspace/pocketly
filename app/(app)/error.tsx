"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="surface mx-auto max-w-xl p-7 text-center sm:p-10" role="alert">
      <p className="section-label">Ada kendala</p>
      <h1 className="mt-2 text-2xl font-bold">Data belum dapat dimuat</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Coba muat ulang halaman. Jika masalah berlanjut, periksa koneksi Supabase.</p>
      <button className="button-primary mt-6" onClick={() => reset()}>Coba lagi</button>
    </section>
  );
}
