"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useCartStore, flushPendingSync } from "@/stores/cart-store";
import { useCurrencyStore, type SupportedCurrency } from "@/stores/currency-store";
import { Button } from "@/components/ui/button";
import { StoreContainer } from "@/components/layout/PageContainer";
import { getImagesForColor } from "@/lib/utils/gallery";
import { getSafeImageUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Package,
  Truck,
  ShieldCheck,
  User,
  Mail,
  Building,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  CreditCard,
  RotateCcw,
  BadgeCheck,
  Banknote,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { CouponInput, AppliedCoupon } from "@/components/cart/CouponInput";

import {
  checkoutAddressSchema,
  CheckoutAddressInput,
} from "@/lib/validations/checkout";
import {
  getEnabledCountries,
  getCountryByCode,
  isCountryEnabled,
} from "@/lib/constants/countries";
import { CURRENCIES, formatCurrency } from "@/lib/constants/currencies";
import { calculateShipping } from "@/lib/checkout/shipping";
import { Elements } from "@stripe/react-stripe-js";
import { getStripeClient } from "@/lib/services/stripe-client";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";

type FormData = CheckoutAddressInput;

export default function CheckoutPage() {
  const router = useRouter();
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const cartItems = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const hasFetchedInitial = useCartStore((state) => state.hasFetchedInitial);

  // Client session-stable idempotency key (persists across re-renders, regenerates on cart/coupon edits or errors)
  const idempotencyKeyRef = useRef<string>("");
  const refreshIdempotencyKey = useCallback(() => {
    idempotencyKeyRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }, []);

  if (!idempotencyKeyRef.current) {
    refreshIdempotencyKey();
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Stripe state
  const [stripePromise] = useState(() => getStripeClient());
  const [stripeData, setStripeData] = useState<{
    clientSecret: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
  } | null>(null);

  const enabledCountries = getEnabledCountries();
  const storeCurrency = useCurrencyStore((state) => state.currency);

  const CURRENCY_TO_COUNTRY: Record<string, string> = {
    GBP: "GB",
    USD: "US",
    NPR: "NP",
    EUR: "US",
  };

  const initialMatchingCountry = CURRENCY_TO_COUNTRY[storeCurrency] || "US";
  const defaultCountry = isCountryEnabled(initialMatchingCountry)
    ? initialMatchingCountry
    : enabledCountries[0]?.code || "NP";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: {
      country: defaultCountry,
      paymentMethod: defaultCountry === "NP" ? "COD" : "STRIPE",
    },
    mode: "onChange",
  });

  const selectedCountryCode = watch("country") || defaultCountry;
  const selectedCountry = getCountryByCode(selectedCountryCode);
  const currentPaymentMethod = watch("paymentMethod") || (selectedCountryCode === "NP" ? "COD" : "STRIPE");

  const rates = useCurrencyStore((state) => state.rates);
  const syncRates = useCurrencyStore((state) => state.syncRatesFromServer);

  useEffect(() => {
    syncRates();
  }, [syncRates]);

  // Synchronize country whenever active currency changes, but do NOT override user's selected currency
  useEffect(() => {
    const matchingCountry = CURRENCY_TO_COUNTRY[storeCurrency];
    if (matchingCountry && isCountryEnabled(matchingCountry) && selectedCountryCode !== matchingCountry) {
      setValue("country", matchingCountry, { shouldValidate: true });
    }
  }, [storeCurrency, selectedCountryCode, setValue]);

  // Selected currency stays persistently selected across checkout without auto-switching
  const currency = storeCurrency || "USD";
  const currencyConfig = CURRENCIES[currency] || CURRENCIES.USD;
  const exchangeRate = rates[currency] || currencyConfig.rateToBaseUSD || 1.0;

  // Price conversion helper ensuring Display = Charge
  const toLocalPrice = (usdPrice: number) => {
    const converted = usdPrice * exchangeRate;
    return currency === "NPR"
      ? Math.round(converted)
      : Math.round(converted * 100) / 100;
  };

  // Synchronize payment method and reset Stripe intent when country changes
  useEffect(() => {
    setStripeData(null);
    if (selectedCountry) {
      const allowed = selectedCountry.allowedPaymentMethods;
      if (!allowed.includes(currentPaymentMethod)) {
        setValue("paymentMethod", allowed[0] || "COD", { shouldValidate: true });
      }
    }
  }, [selectedCountryCode, selectedCountry, currentPaymentMethod, setValue]);

  // Load cart from DB once on mount if logged in and not yet fetched
  useEffect(() => {
    if (isLoggedIn && !hasFetchedInitial) {
      fetchCart();
    }
  }, [isLoggedIn, hasFetchedInitial, fetchCart]);

  // Reset Stripe payment intent and refresh idempotency key if items in cart change so total amount matches
  useEffect(() => {
    if (stripeData) {
      setStripeData(null);
    }
    refreshIdempotencyKey();
  }, [cartItems, refreshIdempotencyKey]);

  // Refresh idempotency key when applied coupon changes
  useEffect(() => {
    if (stripeData) {
      setStripeData(null);
    }
    refreshIdempotencyKey();
  }, [appliedCoupon, refreshIdempotencyKey]);

  const handleCheckoutQuantity = (variantId: string, newQty: number, maxStock: number) => {
    if (newQty < 1) return; // Minimum-1 rule
    if (newQty > maxStock) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: maxStock <= 0 ? "Out of stock" : `Only ${maxStock} left in stock`,
        })
      );
      return;
    }
    updateQuantity(variantId, newQty);
  };

  const handleCheckoutRemove = (variantId: string) => {
    removeItem(variantId);
  };

  const items = cartItems.map((i) => {
    const rawUsdPrice = Number(i.price) || 0;
    const localPrice = toLocalPrice(rawUsdPrice);
    return {
      variantId: i.variantId,
      productId: i.productId,
      quantity: i.quantity,
      usdPrice: rawUsdPrice,
      localPrice,
      productName: i.productName,
      image: i.image || "/images/Shoes/s05.avif",
      size: i.size,
      color: i.color,
      stock: i.stock ?? 999,
    };
  });

  const subtotal = items.reduce(
    (sum, i) => sum + i.localPrice * i.quantity,
    0
  );

  const shippingQuote = calculateShipping(subtotal, selectedCountryCode);
  const shipping = shippingQuote.shippingCost;
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + shipping - discountAmount);

  async function onSubmit(data: FormData) {
    flushPendingSync();
    setError("");
    setLoading(true);

    const guestNameToSend = data.guestName?.trim() || data.fullName?.trim();

    try {
      if (data.paymentMethod === "STRIPE") {
        const res = await fetch("/api/checkout/stripe/create-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKeyRef.current,
          },
          body: JSON.stringify({
            ...data,
            paymentMethod: "STRIPE",
            idempotencyKey: idempotencyKeyRef.current,
            couponCode: appliedCoupon?.code,
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
          refreshIdempotencyKey();
          console.error("[Checkout] Stripe intent initialization error:", result);
          setError(result.error ?? "Failed to initialize card payment. Please try again.");
          return;
        }

        setStripeData({
          clientSecret: result.clientSecret,
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          amount: result.amount,
          currency: result.currency,
        });
        return;
      }
      if (data.paymentMethod === "KHALTI") {
        const res = await fetch("/api/checkout/khalti/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKeyRef.current,
          },
          body: JSON.stringify({
            ...data,
            paymentMethod: "KHALTI",
            idempotencyKey: idempotencyKeyRef.current,
            couponCode: appliedCoupon?.code,
            guestEmail: isLoggedIn ? undefined : data.guestEmail,
            guestName: isLoggedIn ? undefined : guestNameToSend,
            items: items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
          }),
        });
        const result = await res.json();
        if (!res.ok) {
          refreshIdempotencyKey();
          setLoading(false);
          setError(result.error ?? "Failed to initialize Khalti payment.");
          return;
        }
        // Clear cart before redirecting
        clearCart();
        // Redirect browser to Khalti payment gateway
        window.location.href = result.paymentUrl;
        return;
      }
      // COD payment flow
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          ...data,
          idempotencyKey: idempotencyKeyRef.current,
          couponCode: appliedCoupon?.code,
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
        refreshIdempotencyKey();
        setError(result.error ?? "Checkout could not be completed. Please try again.");
        return;
      }

      clearCart();

      router.push(`/order-confirmation/${result.order.id}`);
    } catch (err: any) {
      refreshIdempotencyKey();
      setLoading(false);
      setError("Network or server connection failed. Please check your connection.");
    }
  }

  function onInvalid(errors: any) {
    const errorKeys = Object.keys(errors);
    const errorCount = errorKeys.length;
    const firstKey = errorKeys[0];

    setError(
      `Please correct the ${errorCount} highlighted error${errorCount > 1 ? "s" : ""
      } below before completing your order.`
    );

    const firstErrorElement = document.querySelector(`[name="${firstKey}"]`);
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      (firstErrorElement as HTMLElement).focus();
    }
  }

  const isCheckoutLoading =
    !mounted ||
    status === "loading" ||
    !hasHydrated ||
    (isLoggedIn && !hasFetchedInitial && cartItems.length === 0);

  if (isCheckoutLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)]">
        <StoreContainer className="py-8 md:py-12 animate-pulse">
          <div className="mb-8 space-y-3">
            <div className="h-4 w-36 rounded bg-[var(--color-sand)]/60" />
            <div className="h-10 w-64 rounded bg-[var(--color-sand)]/70" />
          </div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
            <div className="space-y-6">
              <div className="h-48 rounded-2xl border border-[var(--color-sand)] bg-white/60 p-6" />
              <div className="h-72 rounded-2xl border border-[var(--color-sand)] bg-white/60 p-6" />
              <div className="h-56 rounded-2xl border border-[var(--color-sand)] bg-white/60 p-6" />
            </div>
            <div className="h-96 rounded-2xl border border-[var(--color-sand)] bg-white/60 p-6" />
          </div>
        </StoreContainer>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <StoreContainer className="flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-sand)]/40 text-[var(--color-navy)] shadow-inner">
          <Package className="h-9 w-9 text-[var(--color-navy)]/60" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] sm:text-4xl">
          Your Cart is Empty
        </h1>
        <p className="mt-3 text-sm text-[var(--color-navy)]/60 max-w-md">
          You don&apos;t have any shoes in your checkout queue right now.
        </p>
        <Button
          className="mt-8 h-12 rounded-xl px-8 bg-[var(--color-navy)] text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 shadow-md transition-all active:scale-95 cursor-pointer"
          onClick={() => router.push("/shop")}
        >
          Explore Collection
        </Button>
      </StoreContainer>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <StoreContainer className="py-8 md:py-12">
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
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
          {/* Main Checkout Area */}
          <div className="space-y-8">
            {stripeData && currentPaymentMethod === "STRIPE" ? (
              <section className="rounded-2xl border-2 border-[var(--color-navy)] bg-white p-6 md:p-8 shadow-lg transition-all animate-in fade-in-50">
                <div className="mb-5 flex items-center justify-between border-b border-[var(--color-sand)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-5 w-5 text-[var(--color-navy)]" />
                    <h3 className="text-base font-bold text-[var(--color-navy)]">
                      Enter Payment Details
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStripeData(null);
                      refreshIdempotencyKey();
                    }}
                    className="text-xs font-semibold text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] underline cursor-pointer"
                  >
                    Edit Shipping Information
                  </button>
                </div>

                <div className="mb-6 rounded-xl bg-[var(--color-sand)]/20 p-4 text-xs text-[var(--color-navy)]/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--color-navy)]">Order #{stripeData.orderNumber}</span>
                    <p className="mt-0.5">Shipping to {watch("city") || "Destination"}, {selectedCountry?.name || watch("country")}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[var(--color-navy)] text-sm">
                      {formatCurrency(stripeData.amount, stripeData.currency)}
                    </span>
                  </div>
                </div>

                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: stripeData.clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#1b2a4a",
                        borderRadius: "12px",
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    orderId={stripeData.orderId}
                    orderNumber={stripeData.orderNumber}
                    amount={stripeData.amount}
                    currency={stripeData.currency}
                    onPaymentSuccess={() => clearCart()}
                  />
                </Elements>
              </section>
            ) : (
              <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
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
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-navy)]/70">
                  <Truck className="h-4 w-4 text-[var(--color-navy)]" />
                  <span>{shippingQuote.carrierName}</span>
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
                    <div className="relative flex rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream)]/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--color-navy)] overflow-hidden transition-all">
                      <div className="flex items-center px-3.5 bg-[var(--color-sand)]/25 border-r border-[var(--color-sand)] text-xs font-bold text-[var(--color-navy)] select-none">
                        <span>{selectedCountry?.dialCode || "+977"}</span>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          placeholder={selectedCountry?.code === "NP" ? "98XXXXXXXX" : "Mobile number"}
                          {...register("phone")}
                          className="h-12 border-0 bg-transparent px-3.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
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
                      placeholder="Street address and building"
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/70">
                      Country
                    </label>
                    <div className="relative">
                      <select
                        {...register("country")}
                        className="h-12 w-full appearance-none rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream)]/50 px-4 text-sm font-medium text-[var(--color-navy)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] cursor-pointer"
                      >
                        {enabledCountries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.country && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.country.message}
                      </p>
                    )}
                  </div>

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
                      Postal Code
                    </label>
                    <Input
                      placeholder={selectedCountry?.postalCodePlaceholder || "Postal code"}
                      {...register("postalCode")}
                      className="h-12 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream)]/50 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-[var(--color-navy)]"
                    />
                    {errors.postalCode && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.postalCode.message}
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
                {selectedCountry?.allowedPaymentMethods.includes("COD") && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("paymentMethod", "COD", { shouldValidate: true });
                    }}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${currentPaymentMethod === "COD"
                        ? "border-[var(--color-navy)] bg-[var(--color-cream)]/80 ring-2 ring-[var(--color-navy)]/20 shadow-xs"
                        : "border-[var(--color-sand)] bg-white hover:border-[var(--color-navy)]/40"
                      }`}
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 shrink-0 ${currentPaymentMethod === "COD"
                          ? "text-[var(--color-navy)]"
                          : "text-gray-300"
                        }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-[var(--color-navy)]" />
                        <p className="font-bold text-sm text-[var(--color-navy)]">
                          Cash on Delivery (COD)
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-navy)]/60">
                        Pay with cash upon domestic doorstep package delivery.
                      </p>
                    </div>
                  </button>
                )}

                {selectedCountry?.allowedPaymentMethods.includes("STRIPE") && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("paymentMethod", "STRIPE", { shouldValidate: true });
                    }}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${currentPaymentMethod === "STRIPE"
                        ? "border-[var(--color-navy)] bg-[var(--color-cream)]/80 ring-2 ring-[var(--color-navy)]/20 shadow-xs"
                        : "border-[var(--color-sand)] bg-white hover:border-[var(--color-navy)]/40"
                      }`}
                  >
                    <CreditCard
                      className={`mt-0.5 h-5 w-5 shrink-0 ${currentPaymentMethod === "STRIPE"
                          ? "text-[var(--color-navy)]"
                          : "text-gray-400"
                        }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[var(--color-navy)]" />
                        <p className="font-bold text-sm text-[var(--color-navy)]">
                          Credit / Debit Card
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-navy)]/60">
                        Secure card processing powered by Stripe.
                      </p>
                    </div>
                  </button>
                )}

                {selectedCountry?.allowedPaymentMethods.includes("KHALTI") && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("paymentMethod", "KHALTI", { shouldValidate: true });
                    }}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${currentPaymentMethod === "KHALTI"
                        ? "border-[#5C2D91] bg-purple-50/70 ring-2 ring-[#5C2D91]/25 shadow-xs"
                        : "border-[var(--color-sand)] bg-white hover:border-[#5C2D91]/40"
                      }`}
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 shrink-0 ${currentPaymentMethod === "KHALTI"
                          ? "text-[#5C2D91]"
                          : "text-gray-300"
                        }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#5C2D91] text-[11px] font-black text-white">
                          K
                        </span>
                        <p className="font-bold text-sm text-[var(--color-navy)]">
                          Khalti Digital Wallet
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-navy)]/60">
                        Pay with Khalti Wallet, e-Banking, or Mobile Banking in Nepal.
                      </p>
                    </div>
                  </button>
                )}
              </div>
              {errors.paymentMethod && (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  {errors.paymentMethod.message}
                </p>
              )}
            </section>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                <Sparkles className="h-5 w-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button Action */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-[var(--color-navy)] text-base font-bold tracking-wide text-[var(--color-cream)] shadow-lg shadow-[var(--color-navy)]/20 transition-all hover:bg-[var(--color-navy)]/90 hover:shadow-xl active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-cream)] border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : currentPaymentMethod === "STRIPE" ? (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>
                      Continue to Card Payment · {formatCurrency(total, currency)}
                    </span>
                  </>
                ) : currentPaymentMethod === "KHALTI" ? (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#5C2D91] text-[10px] font-black text-white">
                      K
                    </span>
                    <span>
                      Pay with Khalti · {formatCurrency(total, currency)}
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>
                      Complete Order (COD) · {formatCurrency(total, currency)}
                    </span>
                  </>
                )}
              </Button>

              <p className="flex items-center justify-center gap-2 text-center text-xs font-medium text-[var(--color-navy)]/60">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Guaranteed Safe &amp; Secure Checkout</span>
              </p>
            </div>
          </form>
        )}
      </div>

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
                      {formatCurrency(shippingQuote.amountNeededForFree, currency)} away
                    </span>
                  )}
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-sand)]/50">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                    style={{
                      width: `${shippingQuote.thresholdProgress}%`,
                    }}
                  />
                </div>
              </div>

              {/* Item List with Thumbnails & Controls */}
              <div className="mt-6 max-h-[340px] overflow-y-auto space-y-3 pr-1 no-scrollbar">
                {items.map((item) => (
                  <div
                    key={item.variantId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-sand)]/50 bg-[var(--color-cream)]/30 p-3 transition-colors hover:bg-[var(--color-cream)]/60"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--color-sand)] bg-white">
                      <Image
                        src={getSafeImageUrl(item.image)}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-navy)]">
                        {item.productName}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-navy)]/60">
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

                      {/* Quantity Modifier controls */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-[var(--color-sand)] bg-white px-1 py-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleCheckoutQuantity(
                                item.variantId,
                                item.quantity - 1,
                                item.stock
                              )
                            }
                            disabled={item.quantity <= 1}
                            className="p-1 text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[var(--color-navy)]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCheckoutQuantity(
                                item.variantId,
                                item.quantity + 1,
                                item.stock
                              )
                            }
                            disabled={item.quantity >= item.stock}
                            className="p-1 text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCheckoutRemove(item.variantId)}
                          className="p-1 text-[var(--color-navy)]/40 hover:text-rose-600 transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-[var(--color-navy)]">
                        {formatCurrency(item.localPrice * item.quantity, currency)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="mt-0.5 text-[10px] text-[var(--color-navy)]/50">
                          {formatCurrency(item.localPrice, currency)} each
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Input Field */}
              <div className="mt-6 border-t border-[var(--color-sand)] pt-5">
                <CouponInput
                  subtotal={subtotal}
                  appliedCoupon={appliedCoupon}
                  onApplyCoupon={(coupon) => setAppliedCoupon(coupon)}
                />
              </div>

              {/* Price Calculation Breakdown */}
              <div className="mt-6 space-y-2.5 border-t border-[var(--color-sand)] pt-4 text-xs font-medium text-[var(--color-navy)]/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[var(--color-navy)]">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-semibold text-[var(--color-navy)]">
                      {formatCurrency(shipping, currency)}
                    </span>
                  )}
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}

                <div className="border-t border-[var(--color-sand)]/60 pt-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                        Total Due
                      </span>
                      <p className="text-[10px] text-[var(--color-navy)]/50">
                        Taxes &amp; shipping included
                      </p>
                    </div>
                    <span className="font-[family-name:var(--font-display)] text-2xl font-black text-[var(--color-navy)]">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reassurance Trust Badges */}
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[var(--color-sand)]/60 pt-4 text-center text-[10px] font-bold text-[var(--color-navy)]/60">
                <div className="flex flex-col items-center gap-1">
                  <BadgeCheck className="h-4 w-4 text-[var(--color-navy)]/70" />
                  <span>100% Authentic</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="h-4 w-4 text-[var(--color-navy)]/70" />
                  <span>30-Day Returns</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="h-4 w-4 text-[var(--color-navy)]/70" />
                  <span>Fast Express</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
