/**
 * Khalti ePayment v2 API Integration Service
 * Documentation: https://docs.khalti.com/khalti-epayment/
 */

import fs from "fs";
import path from "path";

/**
 * Dynamically resolves Khalti Secret Key from process.env with fallback
 * to reading .env / .env.local on disk to handle hot updates without server restart.
 */
export function getKhaltiSecretKey(): string {
    let key = process.env.KHALTI_SECRET_KEY?.trim() || "";
    if (!key && process.env.NODE_ENV !== "production" && typeof window === "undefined") {
        try {
            const cwd = process.cwd();
            const envFiles = [".env.local", ".env"];
            for (const file of envFiles) {
                const filePath = path.resolve(/*turbopackIgnore: true*/ cwd, file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, "utf8");
                    const match = content.match(/^KHALTI_SECRET_KEY=["']?([^"'\r\n]+)["']?/m);
                    if (match && match[1]) {
                        key = match[1].trim();
                        process.env.KHALTI_SECRET_KEY = key;
                        break;
                    }
                }
            }
        } catch {}
    }
    return key;
}

/**
 * Dynamically resolves Khalti API URL.
 */
export function getKhaltiApiUrl(): string {
    let url = process.env.KHALTI_API_URL?.trim() || "";
    if (!url && process.env.NODE_ENV !== "production" && typeof window === "undefined") {
        try {
            const cwd = process.cwd();
            const envFiles = [".env.local", ".env"];
            for (const file of envFiles) {
                const filePath = path.resolve(/*turbopackIgnore: true*/ cwd, file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, "utf8");
                    const match = content.match(/^KHALTI_API_URL=["']?([^"'\r\n]+)["']?/m);
                    if (match && match[1]) {
                        url = match[1].trim();
                        process.env.KHALTI_API_URL = url;
                        break;
                    }
                }
            }
        } catch {}
    }
    return url || "https://dev.khalti.com/api/v2";
}

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
    const secretKey = getKhaltiSecretKey();
    if (!secretKey) {
        throw new Error("Missing KHALTI_SECRET_KEY in server environment variables. Please ensure KHALTI_SECRET_KEY is set in your .env file.");
    }

    const apiUrl = getKhaltiApiUrl();

    // Khalti Authorization header expects "Key <SECRET_KEY>"
    const authHeader = secretKey.startsWith("Key ")
        ? secretKey
        : `Key ${secretKey}`;

    const response = await fetch(`${apiUrl}/epayment/initiate/`, {
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
    const secretKey = getKhaltiSecretKey();
    if (!secretKey) {
        throw new Error("Missing KHALTI_SECRET_KEY in server environment variables. Please ensure KHALTI_SECRET_KEY is set in your .env file.");
    }

    const apiUrl = getKhaltiApiUrl();
    const authHeader = secretKey.startsWith("Key ")
        ? secretKey
        : `Key ${secretKey}`;

    const response = await fetch(`${apiUrl}/epayment/lookup/`, {
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
    const secretKey = getKhaltiSecretKey();
    if (!secretKey) {
        throw new Error("Missing KHALTI_SECRET_KEY in server environment variables. Please ensure KHALTI_SECRET_KEY is set in your .env file.");
    }

    const apiUrl = getKhaltiApiUrl();
    const authHeader = secretKey.startsWith("Key ")
        ? secretKey
        : `Key ${secretKey}`;

    try {
        const response = await fetch(`${apiUrl}/epayment/refund/`, {
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
