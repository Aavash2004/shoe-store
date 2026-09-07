import { NextRequest, NextResponse } from "next/server";
import { verifyKhaltiPayment } from "../../../../lib/services/khalti";
import { handlePaymentSuccess, handlePaymentFailure } from "../../../../lib/services/payment.service";

/**
 * Khalti Callback & Webhook Handler (/api/webhooks/khalti)
 * Handles Khalti redirect query params / webhook callbacks.
 * Verifies transaction status with Khalti lookup API before updating order state.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pidx = searchParams.get("pidx");
  const status = searchParams.get("status");
  const orderId = searchParams.get("purchase_order_id");

  if (!pidx) {
    return NextResponse.json({ error: "Missing pidx parameter" }, { status: 400 });
  }

  try {
    // Server-to-server verification with Khalti
    const verification = await verifyKhaltiPayment(pidx);

    const targetOrderId = orderId || verification.purchase_order_id;

    if (verification.status === "Completed") {
      const result = await handlePaymentSuccess(
        targetOrderId,
        verification.transaction_id || pidx,
        "Khalti"
      );

      // Redirect user to success page
      const successUrl = new URL("/checkout/success", request.url);
      successUrl.searchParams.set("orderNumber", result.orderNumber || targetOrderId);
      return NextResponse.redirect(successUrl);
    } else {
      await handlePaymentFailure(
        targetOrderId,
        `Khalti payment status: ${verification.status}`
      );

      const cancelUrl = new URL("/checkout", request.url);
      cancelUrl.searchParams.set("error", `Payment ${verification.status}`);
      return NextResponse.redirect(cancelUrl);
    }
  } catch (err: any) {
    console.error("[Khalti Callback Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process Khalti callback." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pidx = body.pidx;

    if (!pidx) {
      return NextResponse.json({ error: "Missing pidx in body" }, { status: 400 });
    }

    const verification = await verifyKhaltiPayment(pidx);
    const targetOrderId = verification.purchase_order_id;

    if (verification.status === "Completed") {
      const result = await handlePaymentSuccess(
        targetOrderId,
        verification.transaction_id || pidx,
        "Khalti"
      );
      return NextResponse.json({ success: true, result });
    } else {
      const result = await handlePaymentFailure(
        targetOrderId,
        `Khalti payment status: ${verification.status}`
      );
      return NextResponse.json({ success: false, result });
    }
  } catch (err: any) {
    console.error("[Khalti POST Webhook Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Khalti webhook failed" },
      { status: 500 }
    );
  }
}
