"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Package,
  Truck,
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Globe,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  CreditCard,
  RotateCcw,
  BadgeCheck,
} from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");

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
        image: i.variant.product.images?.[0]?.url || "/images/Shoes/s05.avif",
        size: i.variant.size,
        color: i.variant.color,
      }))
    : localItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
        productName: i.productName,
        image: i.image || "/images/Shoes/s05.avif",
        size: i.size,
        color: i.color,
      }));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const freeShippingThreshold = 75;
  const shipping = subtotal >= freeShippingThreshold ? 0 : 8.5;
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + shipping - discountAmount);

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
      <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-sand)]/40 text-[var(--color-navy)] shadow-inner">
          <Package className="h-9 w-9 text-[var(--color-navy)]/60" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] sm:text-4xl">
          Your Cart is Empty
        </h1>
        <p className="mt-3 text-sm text-[var(--color-navy)]/60">
          You don&apos;t have any shoes in your checkout queue right now.
        </p>
        <Button
          className="mt-8 h-13 rounded-2xl px-9 bg-[var(--color-navy)] text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 shadow-md transition-all active:scale-95"
          onClick={() => router.push("/shop")}
        >
          Explore Collection
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        {/* Breadcrumb Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/50">
            <Link href="/cart" className="hover:text-[var(--color-navy)] transition-colors">
              Cart
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[var(--color-navy)] font-bold">Checkout</span>
            <ChevronRight className="h-3.5 w-3.5 text-[var(--color-navy)]/30" />
            <span className="text-[var(--color-navy)]/30">Confirmation</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-navy)] md:text-4xl">
              Express Checkout
            </h1>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-800">
              <Lock className="h-3.5 w-3.5 text-emerald-700" />
              <span>256-Bit Encrypted & Secure</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
          {/* Main Form Area */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Step 1: Contact Information (Guest Only) */}
            {!isLoggedIn && (
              <section className="rounded-2xl border border-[var(--color-sand)] bg-white/80 p-6 md:p-8 shadow-sm backdrop-blur-xs transition-all hover:shadow-md">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-navy)] text-xs font-bold text-[var(--color-cream)]">
                    1
                  </span>
                  <h2 className="text-base font-bold text-[var(--color-navy)] tracking-tight">
                    Contact Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-navy)]/40">
                        <Mail className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="you@example.com"
                        {...register("guestEmail")}
                        className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 pl-10 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                      />
                    </div>
                    {errors.guestEmail && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.guestEmail.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-navy)]/40">
                        <User className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="John Doe"
                        {...register("guestName")}
                        className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 pl-10 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Step 2: Shipping Address */}
            <section className="rounded-2xl border border-[var(--color-sand)] bg-white/80 p-6 md:p-8 shadow-sm backdrop-blur-xs transition-all hover:shadow-md">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-navy)] text-xs font-bold text-[var(--color-cream)]">
                    {isLoggedIn ? "1" : "2"}
                  </span>
                  <h2 className="text-base font-bold text-[var(--color-navy)] tracking-tight">
                    Shipping Address
                  </h2>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--color-navy)]/60">
                  <Truck className="h-4 w-4 text-[var(--color-navy)]" />
                  <span>Doorstep Delivery</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      Recipient Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-navy)]/40">
                        <User className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="Full name"
                        {...register("fullName")}
                        className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 pl-10 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-navy)]/40">
                        <Phone className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="+1 555-019-2834"
                        {...register("phone")}
                        className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 pl-10 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                    Street Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-navy)]/40">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder="123 Main Street, Apt or Suite"
                      {...register("line1")}
                      className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 pl-10 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                    />
                  </div>
                  {errors.line1 && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                      {errors.line1.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                    Apartment / Suite (Optional)
                  </label>
                  <Input
                    placeholder="Building, suite, floor, etc."
                    {...register("line2")}
                    className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      City
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-navy)]/40">
                        <Building className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="City"
                        {...register("city")}
                        className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 pl-10 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                      />
                    </div>
                    {errors.city && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      State / Region
                    </label>
                    <Input
                      placeholder="State / Province"
                      {...register("state")}
                      className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                    />
                    {errors.state && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.state.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      Country
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-navy)]/40">
                        <Globe className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="Country"
                        {...register("country")}
                        className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 pl-10 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                      />
                    </div>
                    {errors.country && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Payment Options */}
            <section className="rounded-2xl border border-[var(--color-sand)] bg-white/80 p-6 md:p-8 shadow-sm backdrop-blur-xs transition-all hover:shadow-md">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-navy)] text-xs font-bold text-[var(--color-cream)]">
                  {isLoggedIn ? "2" : "3"}
                </span>
                <h2 className="text-base font-bold text-[var(--color-navy)] tracking-tight">
                  Payment Method
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    paymentMethod === "cod"
                      ? "border-[var(--color-navy)] bg-[var(--color-cream)]/80 ring-2 ring-[var(--color-navy)]/20 shadow-xs"
                      : "border-[var(--color-sand)] bg-white hover:border-[var(--color-navy)]/40"
                  }`}
                >
                  <CheckCircle2
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      paymentMethod === "cod"
                        ? "text-[var(--color-navy)]"
                        : "text-gray-300"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm text-[var(--color-navy)]">
                      Cash on Delivery (COD)
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-navy)]/60">
                      Pay with cash upon package delivery.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    paymentMethod === "card"
                      ? "border-[var(--color-navy)] bg-[var(--color-cream)]/80 ring-2 ring-[var(--color-navy)]/20 shadow-xs"
                      : "border-[var(--color-sand)] bg-white hover:border-[var(--color-navy)]/40"
                  }`}
                >
                  <CreditCard
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      paymentMethod === "card"
                        ? "text-[var(--color-navy)]"
                        : "text-gray-400"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm text-[var(--color-navy)]">
                      Credit / Debit Card
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-navy)]/60">
                      Standard card processing upon order validation.
                    </p>
                  </div>
                </button>
              </div>
            </section>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                <Sparkles className="h-5 w-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Place Order CTA Button */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-[var(--color-navy)] text-base font-bold tracking-wide text-[var(--color-cream)] shadow-lg shadow-[var(--color-navy)]/20 transition-all hover:bg-[var(--color-navy)]/90 hover:shadow-xl active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-cream)] border-t-transparent" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>Complete Order · ${total.toFixed(2)}</span>
                  </>
                )}
              </Button>

              <p className="flex items-center justify-center gap-2 text-center text-xs font-medium text-[var(--color-navy)]/60">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Guaranteed Safe & Secure Checkout</span>
              </p>
            </div>
          </form>

          {/* Sticky Order Summary Panel */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-[var(--color-sand)] bg-white/90 p-6 md:p-8 shadow-xl shadow-[var(--color-sand)]/30 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-[var(--color-sand)] pb-4">
                <h2 className="text-base font-extrabold uppercase tracking-wider text-[var(--color-navy)]">
                  Order Summary
                </h2>
                <span className="rounded-full bg-[var(--color-sand)]/40 px-3 py-1 text-xs font-bold text-[var(--color-navy)]">
                  {items.reduce((s, i) => s + i.quantity, 0)} Items
                </span>
              </div>

              {/* Free Shipping Progress Indicator */}
              <div className="mt-5 rounded-2xl border border-[var(--color-sand)]/60 bg-[var(--color-cream)]/50 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--color-navy)]">
                  <span>Shipping Progress</span>
                  {shipping === 0 ? (
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> FREE SHIPPING
                    </span>
                  ) : (
                    <span className="text-[var(--color-navy)]/70">
                      ${(freeShippingThreshold - subtotal).toFixed(2)} away
                    </span>
                  )}
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-sand)]/50">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (subtotal / freeShippingThreshold) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Item List with Thumbnails */}
              <div className="mt-6 max-h-[300px] overflow-y-auto space-y-4 pr-1 no-scrollbar">
                {items.map((item) => (
                  <div
                    key={item.variantId}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-sand)]/50 bg-[var(--color-cream)]/30 p-3 transition-colors hover:bg-[var(--color-cream)]/60"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--color-sand)] bg-white">
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                      <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-navy)] text-[10px] font-bold text-[var(--color-cream)] shadow-xs">
                        {item.quantity}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-navy)]">
                        {item.productName}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-navy)]/60">
                        {item.size && (
                          <span className="rounded-md border border-[var(--color-sand)] bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                            Size {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="rounded-md border border-[var(--color-sand)] bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                            {item.color}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="font-bold text-sm text-[var(--color-navy)] shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="mt-6 border-t border-[var(--color-sand)] pt-5">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                  Promo Code
                </p>
                <CouponInput
                  subtotal={subtotal}
                  appliedCoupon={appliedCoupon}
                  onApplyCoupon={setAppliedCoupon}
                />
              </div>

              {/* Subtotal & Shipping Costs */}
              <div className="mt-5 space-y-2.5 border-t border-[var(--color-sand)] pt-4 text-sm font-medium">
                <div className="flex justify-between text-[var(--color-navy)]/70">
                  <span>Subtotal</span>
                  <span className="font-bold text-[var(--color-navy)]">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-${appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--color-navy)]/70">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="font-extrabold text-emerald-600 uppercase tracking-wider text-xs">
                        Free Delivery
                      </span>
                    ) : (
                      <span className="font-bold text-[var(--color-navy)]">
                        ${shipping.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="mt-5 flex items-baseline justify-between border-t border-[var(--color-sand)] pt-5 text-lg font-black text-[var(--color-navy)]">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-[var(--color-navy)]">
                    Total Due
                  </p>
                  <p className="text-[10px] font-normal text-[var(--color-navy)]/50">
                    Includes taxes & shipping
                  </p>
                </div>
                <span className="font-mono text-2xl font-black tracking-tight text-[var(--color-navy)]">
                  ${total.toFixed(2)}
                </span>
              </div>

              {/* Store Guarantee Badges */}
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[var(--color-sand)] pt-5 text-center text-[10px] font-semibold text-[var(--color-navy)]/70">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--color-cream)]/40">
                  <BadgeCheck className="h-4 w-4 text-[var(--color-navy)]" />
                  <span>100% Authentic</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--color-cream)]/40">
                  <RotateCcw className="h-4 w-4 text-[var(--color-navy)]" />
                  <span>30-Day Returns</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--color-cream)]/40">
                  <Truck className="h-4 w-4 text-[var(--color-navy)]" />
                  <span>Fast Express</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}