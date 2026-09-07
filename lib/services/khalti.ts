export interface KhaltiInitiateParams {
  orderId: string;
  orderNumber: string;
  totalNpr: number; // total in NPR (e.g. 150.00)
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  websiteUrl?: string;
}

export interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

export interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: "Completed" | "Pending" | "Initiated" | "Refunded" | "Expired" | "User canceled";
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
  purchase_order_id: string;
  purchase_order_name: string;
}

const KHALTI_BASE_URL =
  process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2/epayment";

/**
 * Initiates a Khalti ePayment v2 transaction.
 * Converts totalNpr to Paisa (totalNpr * 100).
 */
export async function initiateKhaltiPayment(
  params: KhaltiInitiateParams
): Promise<KhaltiInitiateResponse> {
  const secretKey = process.env.KHALTI_SECRET_KEY || "Key 98000000000000000000000000000000";

  // Khalti expects amount in Paisa (1 NPR = 100 Paisa)
  const amountInPaisa = Math.round(params.totalNpr * 100);

  const payload = {
    return_url: params.returnUrl,
    website_url: params.websiteUrl || "http://localhost:3001",
    amount: amountInPaisa,
    purchase_order_id: params.orderId,
    purchase_order_name: `Shoe Store Order #${params.orderNumber}`,
    customer_info: {
      name: params.customerName || "Customer",
      email: params.customerEmail || "customer@example.com",
      phone: params.customerPhone || "9800000000",
    },
  };

  const response = await fetch(`${KHALTI_BASE_URL}/initiate/`, {
    method: "POST",
    headers: {
      Authorization: secretKey.startsWith("Key ") ? secretKey : `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.payment_url) {
    console.error("[Khalti Initiate Error]:", data);
    throw new Error(
      data?.detail || data?.message || "Failed to initiate payment with Khalti."
    );
  }

  return data as KhaltiInitiateResponse;
}

/**
 * Verifies/looks up a Khalti ePayment v2 transaction status using pidx.
 */
export async function verifyKhaltiPayment(
  pidx: string
): Promise<KhaltiLookupResponse> {
  const secretKey = process.env.KHALTI_SECRET_KEY || "Key 98000000000000000000000000000000";

  const response = await fetch(`${KHALTI_BASE_URL}/lookup/`, {
    method: "POST",
    headers: {
      Authorization: secretKey.startsWith("Key ") ? secretKey : `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Khalti Verification Error]:", data);
    throw new Error(data?.detail || data?.message || "Failed to verify Khalti payment.");
  }

  return data as KhaltiLookupResponse;
}
