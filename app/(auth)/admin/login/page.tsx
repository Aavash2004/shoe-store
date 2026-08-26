import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield } from "lucide-react";
import { AdminLoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 lg:order-2 lg:py-16">
        {/* Mobile-only compact image strip */}
        <div className="relative mb-8 h-40 w-full max-w-sm overflow-hidden rounded-2xl lg:hidden">
          <Image
            src="/images/Shoes/so3.avif"
            alt="Featured shoe"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-2xl text-white"
            >
              Shoe Store
            </Link>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10">
              <Shield className="h-5 w-5 text-navy" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
                Admin Access
              </h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-navy/60">
            Sign in to manage your store.
          </p>

          <Suspense>
            <AdminLoginForm />
          </Suspense>

          <p className="mt-8 text-center text-sm text-navy/60">
            <Link
              href="/auth/login"
              className="font-medium text-accent hover:underline"
            >
              Sign in as customer instead
            </Link>
          </p>
        </div>
      </div>

      {/* Hero side */}
      <div className="relative hidden overflow-hidden bg-navy lg:order-1 lg:block">
        <Image
          src="/images/Shoes/so3.avif"
          alt="Featured shoe"
          fill
          className="object-cover opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/60">
            Shoe Store
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-cream">
            Manage your store.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-cream/70">
            Access the admin dashboard to oversee products, orders, and
            inventory.
          </p>
        </div>
      </div>
    </div>
  );
}
