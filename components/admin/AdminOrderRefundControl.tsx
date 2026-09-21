"use client";

import { useState, useTransition } from "react";
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refundStripeOrder } from "@/app/admin/orders/[id]/actions";

export function AdminOrderRefundControl({
  orderId,
  paymentStatus,
  paymentMethod,
  stripePaymentIntentId,
  totalFormatted,
}: {
  orderId: string;
  paymentStatus: string;
  paymentMethod: string | null;
  stripePaymentIntentId: string | null;
  totalFormatted: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // Can only refund if payment is PAID and was paid via STRIPE
  const canRefund =
    paymentStatus === "PAID" &&
    paymentMethod === "STRIPE" &&
    Boolean(stripePaymentIntentId);

  if (!canRefund) return null;

  const handleRefund = () => {
    setErrorMessage("");
    startTransition(async () => {
      const res = await refundStripeOrder(orderId, "Customer refund requested via admin panel");
      if (res.success) {
        setSuccess(true);
        setShowConfirm(false);
      } else {
        setErrorMessage(res.error || "Failed to issue refund.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {success ? (
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          Refund processed successfully!
        </span>
      ) : showConfirm ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="text-rose-900 font-medium">
            Issue full refund of {totalFormatted}?
          </span>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={handleRefund}
            className="h-7 px-2.5 text-xs rounded-lg"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setShowConfirm(false)}
            className="h-7 px-2 text-xs rounded-lg text-rose-700 hover:bg-rose-100"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
          <span>Issue Refund ({totalFormatted})</span>
        </button>
      )}

      {errorMessage && (
        <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
      )}
    </div>
  );
}
