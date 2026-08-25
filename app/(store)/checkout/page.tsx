"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestName: z.string().optional(),
  fullName: z.string().min(1, "Required"),
  phone: z.string().min(7, "Required"),
  line1: z.string().min(1, "Required"),
  line2: z.string().optional(),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  postalCode: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(formSchema), mode: "onChange" });

  // fetch DB cart on mount if logged in
  useState(() => {
    if (isLoggedIn) {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((data) => setDbItems(data.items ?? []));
    }
  });

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

  async function onSubmit(data: FormData) {
    setError("");
    setLoading(true);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        guestEmail: isLoggedIn ? undefined : data.guestEmail,
        guestName: isLoggedIn ? undefined : data.guestName,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
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
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          Your cart is empty
        </h1>
        <Button className="mt-6" onClick={() => router.push("/shop")}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!isLoggedIn && (
            <>
              <h2 className="text-sm font-medium text-navy">Contact</h2>
              <Input placeholder="Email" {...register("guestEmail")} />
              {errors.guestEmail && <p className="text-xs text-red-600">{errors.guestEmail.message}</p>}
              <Input placeholder="Full name (for guest record)" {...register("guestName")} />
            </>
          )}

          <h2 className="mt-4 text-sm font-medium text-navy">Shipping Address</h2>
          <Input placeholder="Full name" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}

          <Input placeholder="Phone" {...register("phone")} />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}

          <Input placeholder="Address line 1" {...register("line1")} />
          {errors.line1 && <p className="text-xs text-red-600">{errors.line1.message}</p>}

          <Input placeholder="Address line 2 (optional)" {...register("line2")} />

          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="City" {...register("city")} />
            <Input placeholder="State" {...register("state")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Postal code" {...register("postalCode")} />
            <Input placeholder="Country" {...register("country")} />
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}

          <Button type="submit" size="lg" disabled={loading} className="mt-4">
            {loading ? "Placing order..." : "Place Order"}
          </Button>
        </form>

        <div className="rounded-lg border border-sand bg-cream-alt p-6">
          <h2 className="font-medium text-navy">Order Summary</h2>
          <div className="mt-4 flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.variantId} className="flex justify-between text-sm text-navy/80">
                <span>{item.productName} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-sand pt-4 text-lg font-medium text-navy">
            Subtotal: ${subtotal.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}