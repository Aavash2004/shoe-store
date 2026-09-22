/**
 * Khalti ePayment v2 API Integration Service
 * Documentation: https://docs.khalti.com/khalti-epayment/
 */

const KHALTI_API_URL =
    process.env.KHALTI_API_URL || "https://dev.khalti.com/api/v2";
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || "";

export interface KhaltiInitiatePayload {
    returnUrl: string;
    websiteUrl: string;
    amountInPaisa: number;
    purchaseOrderId: string;
    purchaseOrderName: string;
    customerInfo: {
        name: string;
        email: string;
        phone: string;
    };
}

export interface KhaltiInitiateResponse {
    pidx: string;
    payment_url: string;
    expires_at: string;
    expires_in: number;
    error_key?: string;
    detail?: string;
}

export interface KhaltiLookupResponse {
    pidx: string;
    total_amount: number;
    status: "Completed" | "Pending" | "Initiated" | "Refunded" | "Expired" | "User canceled";
    transaction_id: string | null;
    fee: number;
    refunded: boolean;
    detail?: string;
}

/**
 * Converts NPR amount to Paisa (1 NPR = 100 Paisa) as required by Khalti API.
 */
export function toKhaltiPaisa(amountInNpr: number): number {
    return Math.round(amountInNpr * 100);
}

/**
 * Initiates an ePayment session on Khalti gateway.
 */
export async function initiateKhaltiPayment(
    payload: KhaltiInitiatePayload
): Promise<KhaltiInitiateResponse> {
    if (!KHALTI_SECRET_KEY) {
        throw new Error("Missing KHALTI_SECRET_KEY in server environment variables.");
    }

    // Khalti Authorization header expects "Key <SECRET_KEY>"
    const authHeader = KHALTI_SECRET_KEY.startsWith("Key ")
        ? KHALTI_SECRET_KEY
        : `Key ${KHALTI_SECRET_KEY}`;

    const response = await fetch(`${KHALTI_API_URL}/epayment/initiate/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
        },
        body: JSON.stringify({
            return_url: payload.returnUrl,
            website_url: payload.websiteUrl,
            amount: payload.amountInPaisa,
            purchase_order_id: payload.purchaseOrderId,
            purchase_order_name: payload.purchaseOrderName,
            customer_info: payload.customerInfo,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("[Khalti Initiate Error]:", data);
        throw new Error(data.detail || data.error_key || "Failed to initiate Khalti payment.");
    }

    return data as KhaltiInitiateResponse;
}

/**
 * Queries Khalti's Lookup API to verify payment status securely on the server.
 */
export async function lookupKhaltiPayment(
    pidx: string
): Promise<KhaltiLookupResponse> {
    if (!KHALTI_SECRET_KEY) {
        throw new Error("Missing KHALTI_SECRET_KEY in server environment variables.");
    }

    const authHeader = KHALTI_SECRET_KEY.startsWith("Key ")
        ? KHALTI_SECRET_KEY
        : `Key ${KHALTI_SECRET_KEY}`;

    const response = await fetch(`${KHALTI_API_URL}/epayment/lookup/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
        },
        body: JSON.stringify({ pidx }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("[Khalti Lookup Error]:", data);
        throw new Error(data.detail || "Failed to verify payment status with Khalti.");
    }

    return data as KhaltiLookupResponse;
}

/**
 * Issues a refund for a Khalti payment via Khalti ePayment v2 API.
 */
export async function refundKhaltiPayment(
    pidx: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!KHALTI_SECRET_KEY) {
        throw new Error("Missing KHALTI_SECRET_KEY in server environment variables.");
    }

    const authHeader = KHALTI_SECRET_KEY.startsWith("Key ")
        ? KHALTI_SECRET_KEY
        : `Key ${KHALTI_SECRET_KEY}`;

    try {
        const response = await fetch(`${KHALTI_API_URL}/epayment/refund/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
            body: JSON.stringify({ pidx }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Khalti Refund Error]:", data);
            return {
                success: false,
                error: data.detail || data.error_key || "Failed to process Khalti refund.",
            };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error("[Khalti Refund Exception]:", err);
        return { success: false, error: err.message || "Failed to connect to Khalti refund API." };
    }
}
