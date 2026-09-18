"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/constants/currencies";

interface StripePaymentFormProps {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  onPaymentSuccess?: () => void;
}

export function StripePaymentForm({
  orderId,
  orderNumber,
  amount,
  currency,
  onPaymentSuccess,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const returnUrl = `${window.location.origin}/order-confirmation/${orderId}`;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      setIsProcessing(false);
      setErrorMessage(
        error.message || "An unexpected error occurred during payment."
      );
    } else if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")
    ) {
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
      window.location.href = returnUrl;
    } else {
      window.location.href = returnUrl;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: {
              applePay: "never",
              googlePay: "never",
            },
          }}
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="h-13 w-full rounded-2xl bg-[var(--color-navy)] text-sm font-bold tracking-wide text-[var(--color-cream)] shadow-md transition-all hover:bg-[var(--color-navy)]/90 active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Authorizing Payment...</span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            <span>Pay {formatCurrency(amount, currency)}</span>
          </>
        )}
      </Button>

      <p className="text-center text-[11px] text-[var(--color-navy)]/50">
        Encrypted &amp; secured via Stripe 256-bit SSL. SCA / 3D Secure compliant.
      </p>
    </form>
  );
}
