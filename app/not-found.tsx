import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-[family-name:var(--font-display)] text-[120px] leading-none text-navy/10 md:text-[180px]">
        404
      </p>
      <h1 className="mt-[-40px] font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-navy md:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-navy/60 md:text-base">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved. Let&apos;s get you back on track.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-md bg-navy px-6 py-3 text-sm font-medium text-cream transition hover:opacity-90"
        >
          Back to Home
        </Link>
        <Link
          href="/shop"
          className="rounded-md border border-sand px-6 py-3 text-sm font-medium text-navy transition hover:bg-cream-alt"
        >
          Browse Shoes
        </Link>
      </div>
    </div>
  );
}