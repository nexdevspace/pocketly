import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Brand /></div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-500">Catatan keuangan tetap di tanganmu. Pocketly tidak terhubung otomatis ke bank atau e-wallet.</p>
      </div>
    </main>
  );
}
