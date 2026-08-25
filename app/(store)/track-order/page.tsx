"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    const res = await fetch(
      `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`
    );
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Order not found");
      return;
    }

    setResult(data.order);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">Track Order</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input placeholder="Order number (e.g. SH-12345)" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required />
        <Input type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>{loading ? "Searching..." : "Track Order"}</Button>
      </form>

      {result && (
        <div className="mt-8 rounded-lg border border-sand bg-cream-alt p-4">
          <p className="font-medium text-navy">{result.orderNumber}</p>
          <p className="mt-1 text-sm text-navy/60">Status: {result.status}</p>
          <p className="mt-1 text-sm text-navy/60">Total: ${Number(result.total).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}