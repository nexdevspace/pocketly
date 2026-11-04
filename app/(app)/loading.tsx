export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-7" aria-label="Memuat data Pocketly" role="status">
      <div><div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" /><div className="mt-3 h-8 w-64 max-w-full rounded bg-slate-200 dark:bg-slate-700" /><div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-200 dark:bg-slate-700" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="surface h-32" />)}</div>
      <div className="grid gap-6 lg:grid-cols-2"><div className="surface h-80" /><div className="surface h-80" /></div>
    </div>
  );
}
