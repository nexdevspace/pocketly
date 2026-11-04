import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Pocketly beranda">
      <Image src="/pocketly.svg" width={38} height={38} alt="" priority />
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight">Pocketly</span>
        {!compact && <span className="block text-xs text-slate-500">Semua uangmu, satu kantong.</span>}
      </span>
    </Link>
  );
}
