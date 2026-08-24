import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { LogoutButton } from "@/components/account/LogoutButton";

export default async function AccountPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
        My Account
      </h1>
      <p className="mt-2 text-navy/70">
        Welcome back, {session?.user?.name ?? session?.user?.email}
      </p>

      <div className="mt-4">
        <LogoutButton />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="rounded-lg border border-sand bg-cream-alt p-6 hover:border-accent"
        >
          <h2 className="font-medium text-navy">Orders</h2>
          <p className="mt-1 text-sm text-navy/60">View your order history</p>
        </Link>

        <Link
          href="/account/wishlist"
          className="rounded-lg border border-sand bg-cream-alt p-6 hover:border-accent"
        >
          <h2 className="font-medium text-navy">Wishlist</h2>
          <p className="mt-1 text-sm text-navy/60">Saved items</p>
        </Link>

        <Link
          href="/account/profile"
          className="rounded-lg border border-sand bg-cream-alt p-6 hover:border-accent"
        >
          <h2 className="font-medium text-navy">Profile</h2>
          <p className="mt-1 text-sm text-navy/60">Manage your details</p>
        </Link>
      </div>
    </div>
  );
}