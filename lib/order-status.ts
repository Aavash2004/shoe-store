export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [], // Terminal fulfillment state
  CANCELLED: [], // Terminal cancelled state
} as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function isValidOrderStatus(status: unknown): status is OrderStatus {
  return typeof status === "string" && (ORDER_STATUSES as readonly string[]).includes(status);
}

export function canTransition(
  from: OrderStatus | string,
  to: OrderStatus | string
): boolean {
  if (!isValidOrderStatus(from) || !isValidOrderStatus(to)) {
    return false;
  }
  if (from === to) {
    return false;
  }
  const allowed = ORDER_TRANSITIONS[from];
  return allowed.includes(to);
}

export function getNextStatuses(from: OrderStatus | string): readonly OrderStatus[] {
  if (!isValidOrderStatus(from)) {
    return [];
  }
  return ORDER_TRANSITIONS[from];
}

export function isTerminalStatus(status: OrderStatus | string): boolean {
  if (!isValidOrderStatus(status)) {
    return true;
  }
  return ORDER_TRANSITIONS[status].length === 0;
}
