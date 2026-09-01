"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Package, Truck } from "lucide-react";
import { CouponInput, AppliedCoupon } from "@/components/cart/CouponInput";

const formSchema = z.object({
  guestEmail: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),

  guestName: z
    .string()
    .trim()
    .max(100, "Name must be less than 100 characters.")
    .optional(),

  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name must be less than 100 characters.")
    .regex(
      /^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u,
      "Please enter a valid name."
    ),

  phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 digits.")
    .max(20, "Phone number is too long.")
    .regex(
      /^\+?[0-9\s\-()]+$/,
      "Please enter a valid phone number."
    )
    .refine(
      (value) => value.replace(/\D/g, "").length >= 7,
      "Phone number must contain at least 7 digits."
    ),

  line1: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters.")
    .max(200, "Address must be less than 200 characters."),

  line2: z
    .string()
    .trim()
    .max(100, "Address line 2 must be less than 100 characters.")
    .optional()
    .or(z.literal("")),

  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters.")
    .max(100, "City must be less than 100 characters.")
    .regex(
      /^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u,
      "Please enter a valid city name."
    ),

  state: z
    .string()
    .trim()
    .min(2, "State / province must be at least 2 characters.")
    .max(100, "State / province must be less than 100 characters.")
    .regex(
      /^[\p{L}\p{M}0-9]+(?:[\s.'-][\p{L}\p{M}0-9]+)*$/u,
      "Please enter a valid state or province."
    ),

  country: z
    .string()
    .trim()
    .min(2, "Please enter a country.")
    .max(100, "Country name is too long."),
});


type FormData = z.infer<typeof formSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const localItems = useCartStore((state) => state.items);
  const clearLocalCart = useCartStore((state) => state.clearCart);

  const [dbItems, setDbItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (isLoggedIn) {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((data) => setDbItems(data.items ?? []));
    }
  }, [isLoggedIn]);

  const items = isLoggedIn
    ? dbItems.map((i) => ({
        variantId: i.variant.id,
        quantity: i.quantity,
        price: Number(i.variant.price),
        productName: i.variant.product.name,
      }))
    : localItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
        productName: i.productName,
      }));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal > 75 ? 0 : 8.5;
  const total = subtotal + shipping;

  async function onSubmit(data: FormData) {
    setError("");
    setLoading(true);

    const guestNameToSend = data.guestName?.trim() || data.fullName?.trim();

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        guestEmail: isLoggedIn ? undefined : data.guestEmail,
        guestName: isLoggedIn ? undefined : guestNameToSend,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      }),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Checkout failed");
      return;
    }

    if (!isLoggedIn) clearLocalCart();
    window.dispatchEvent(new Event("cart-updated"));

    router.push(`/checkout/success?order=${result.order.orderNumber}`);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-sand)]/50">
          <Package className="h-7 w-7 text-[var(--color-navy)]/60" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-navy)]">
          Your cart is empty
        </h1>
        <p className="mt-2 text-[var(--color-navy)]/60">
          Looks like you haven’t added anything yet.
        </p>
        <Button
          className="mt-8 h-12 rounded-xl px-8"
          onClick={() => router.push("/shop")}
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-navy)]/50">
            Secure checkout
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--color-navy)] md:text-4xl">
            Checkout
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact (guest only) */}
            {!isLoggedIn && (
              <section className="rounded-2xl border border-[var(--color-sand)] bg-white/70 p-6 shadow-sm">
                <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[var(--color-navy)]">
                  Contact
                </h2>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Email address"
                      {...register("guestEmail")}
                      className="h-12 rounded-xl"
                    />
                    {errors.guestEmail && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.guestEmail.message}
                      </p>
                    )}
                  </div>
                  <Input
                    placeholder="Full name"
                    {...register("guestName")}
                    className="h-12 rounded-xl"
                  />
                </div>
              </section>
            )}

            {/* Shipping */}
            <section className="rounded-2xl border border-[var(--color-sand)] bg-white/70 p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Truck className="h-4 w-4 text-[var(--color-navy)]/70" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-navy)]">
                  Shipping Address
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Full name"
                    {...register("fullName")}
                    className="h-12 rounded-xl"
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    placeholder="Phone number"
                    {...register("phone")}
                    className="h-12 rounded-xl"
                  />
                  {errors.phone && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    placeholder="Address line 1"
                    {...register("line1")}
                    className="h-12 rounded-xl"
                  />
                  {errors.line1 && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.line1.message}
                    </p>
                  )}
                </div>

                <Input
                  placeholder="Address line 2 (optional)"
                  {...register("line2")}
                  className="h-12 rounded-xl"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Input
                      placeholder="City"
                      {...register("city")}
                      className="h-12 rounded-xl"
                    />
                    {errors.city && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="State / Province"
                      {...register("state")}
                      className="h-12 rounded-xl"
                    />
                    {errors.state && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Input
                    placeholder="Country"
                    {...register("country")}
                    className="h-12 rounded-xl"
                  />
                  {errors.country && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-13 w-full rounded-xl bg-[var(--color-navy)] text-base font-medium text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 disabled:opacity-60"
            >
              {loading ? "Placing order..." : "Place Order"}
            </Button>

            <p className="flex items-center justify-center gap-2 text-xs text-[var(--color-navy)]/50">
              <Lock className="h-3.5 w-3.5" />
              Secure checkout · Encrypted end-to-end
            </p>
          </form>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-[var(--color-sand)] bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-navy)]">
                Order Summary
              </h2>

              <div className="mt-5 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.variantId}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-[var(--color-navy)]">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 text-[var(--color-navy)]/50">
                        Qty {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-[var(--color-navy)]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-[var(--color-sand)] pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/60 mb-2">
                  Promo Code
                </p>
                <CouponInput
                  subtotal={subtotal}
                  appliedCoupon={appliedCoupon}
                  onApplyCoupon={setAppliedCoupon}
                />
              </div>

              <div className="mt-5 space-y-2 border-t border-[var(--color-sand)] pt-4 text-sm">
                <div className="flex justify-between text-[var(--color-navy)]/70">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Promo Discount ({appliedCoupon.code})</span>
                    <span>-${appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--color-navy)]/70">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-semibold">Free</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex justify-between border-t border-[var(--color-sand)] pt-4 text-base font-bold text-[var(--color-navy)]">
                <span>Total</span>
                <span>${Math.max(0, total - (appliedCoupon?.discountAmount ?? 0)).toFixed(2)}</span>
              </div>

              {subtotal < 75 && (
                <p className="mt-4 rounded-lg bg-[var(--color-sand)]/40 px-3 py-2 text-xs text-[var(--color-navy)]/70">
                  Add ${(75 - subtotal).toFixed(2)} more for free shipping
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}