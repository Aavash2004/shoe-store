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

const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

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

    function handleSave() {
        startTransition(async () => {
            const result = await updateOrderStatus(orderId, status);
            if (result.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        });
    }

    return (
        <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="h-10 w-40 border-sand bg-cream-alt/60 text-sm text-navy">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                            {s}
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
    );
}