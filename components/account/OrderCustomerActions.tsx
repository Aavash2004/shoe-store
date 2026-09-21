"use client";

import { useState, useTransition } from "react";
import { Printer, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelCustomerOrder } from "@/app/account/orders/[id]/actions";

export function OrderCustomerActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canCancel = status === "PENDING";

  const handlePrint = () => {
    window.print();
  };

  const handleCancel = () => {
    setErrorMessage("");
    startTransition(async () => {
      const res = await cancelCustomerOrder(orderId);
      if (!res.success) {
        setErrorMessage(res.error || "Unable to cancel order.");
      } else {
        setShowConfirm(false);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 print:hidden">
      {/* Print Invoice Button */}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[var(--color-sand)] text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/20 transition-colors cursor-pointer shadow-2xs"
      >
        <Printer className="w-3.5 h-3.5 text-[var(--color-navy)]/60" />
        <span>Print Receipt</span>
      </button>

      {/* Cancel Order Button */}
      {canCancel && (
        <>
          {showConfirm ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 animate-in fade-in-50">
              <span className="text-xs font-semibold text-rose-800">
                Cancel this order?
              </span>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleCancel}
                className="h-7 text-[11px] px-2.5 rounded-lg"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes, Cancel"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setShowConfirm(false)}
                className="h-7 text-[11px] px-2 rounded-lg text-rose-700 hover:bg-rose-100"
              >
                Keep
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50/70 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100/70 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Cancel Order</span>
            </button>
          )}
        </>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
