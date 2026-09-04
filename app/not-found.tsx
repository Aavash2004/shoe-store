import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-[family-name:var(--font-display)] text-[110px] sm:text-[150px] font-black leading-none text-[var(--color-navy)]/10 select-none">
        404
      </p>
      <h1 className="-mt-8 sm:-mt-12 font-[family-name:var(--font-display)] text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-navy)]">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-xs sm:text-sm text-[var(--color-navy)]/65 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back on track.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-6 py-3 text-xs font-bold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-all shadow-2xs active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/shop"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-6 py-3 text-xs font-bold text-[var(--color-navy)] hover:border-[var(--color-navy)]/40 hover:bg-white transition-all shadow-2xs"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Browse Collection</span>
        </Link>
      </div>
    </div>
  );
}