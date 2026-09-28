"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "@/app/admin/orders/[id]/actions";
import {
  getNextStatuses,
  isTerminalStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-status";
import { AlertCircle } from "lucide-react";

export function OrderStatusControl({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isTerminal = isTerminalStatus(currentStatus);
  const nextStatuses = getNextStatuses(currentStatus);

  if (isTerminal) {
    const isCancelled = currentStatus === "CANCELLED";
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide border border-sand bg-cream-alt text-navy">
        <span
          className={`h-2 w-2 rounded-full ${
            isCancelled ? "bg-rose-500" : "bg-emerald-500"
          }`}
        />
        <span>
          {ORDER_STATUS_LABELS[currentStatus as OrderStatus] || currentStatus} (Terminal)
        </span>
      </div>
    );
  }

  function handleSave() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setErrorMessage(result.error || "Failed to update order status.");
      }
    });
  }

  const availableOptions: OrderStatus[] = [
    currentStatus as OrderStatus,
    ...nextStatuses,
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="h-10 w-44 border-sand bg-cream-alt/60 text-sm text-navy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABELS[s] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleSave}
          disabled={isPending || status === currentStatus}
          size="sm"
        >
          {isPending ? "Saving..." : saved ? "Saved!" : "Update"}
        </Button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}