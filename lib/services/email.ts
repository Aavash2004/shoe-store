import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "ABXV Store <onboarding@resend.dev>";

function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

const appUrl = resolveAppUrl();

/**
 * Base email layout wrapper with modern dark navy / luxury branding
 */
function wrapEmailHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c1017; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c1017; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #161c28; border-radius: 12px; border: 1px solid #283347; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px 20px; background: linear-gradient(180deg, #1e2638 0%, #161c28 100%); border-bottom: 1px solid #283347; text-align: center;">
              <a href="${appUrl}" style="text-decoration: none;">
                <span style="font-size: 26px; font-weight: 800; letter-spacing: 3px; color: #ffffff; text-transform: uppercase;">ABXV</span>
                <span style="display: block; font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #38bdf8; margin-top: 4px; text-transform: uppercase;">Footwear Atelier</span>
              </a>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 40px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #101520; border-top: 1px solid #283347; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">Need assistance? Contact our concierge at <a href="${appUrl}/contact" style="color: #38bdf8; text-decoration: none;">Support & Concierge</a></p>
              <p style="margin: 0; color: #64748b;">&copy; ${new Date().getFullYear()} ABXV Footwear Inc. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const RESEND_DEV_AUTHORIZED_EMAIL =
  process.env.RESEND_DEV_AUTHORIZED_EMAIL || "basnetaavash7@gmail.com";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Core transactional email sender with automated Resend sandbox reroute protection.
 * In Resend's free tier (onboarding@resend.dev), Resend strictly rejects any recipient
 * other than the registered account owner (403 validation_error).
 * In development / sandbox mode, this automatically redirects outbound emails to the
 * authorized account email with an injected notice banner so developers can inspect
 * real emails in their inbox without getting blocked.
 */
async function sendTransactionalEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  const isResendSandbox = fromEmail.includes("@resend.dev");
  const isAuthorizedRecipient =
    to.trim().toLowerCase() === RESEND_DEV_AUTHORIZED_EMAIL.trim().toLowerCase();

  let targetRecipient = to;
  let finalSubject = subject;
  let finalHtml = html;

  if (isResendSandbox && !isAuthorizedRecipient) {
    console.warn(
      `[Email Service] Sandbox Mode: Rerouting email intended for "${to}" to authorized dev inbox "${RESEND_DEV_AUTHORIZED_EMAIL}"`
    );
    targetRecipient = RESEND_DEV_AUTHORIZED_EMAIL;
    finalSubject = `[Dev Test for: ${to}] ${subject}`;

    const sandboxNotice = `
      <div style="background-color: #1a2233; border: 1px solid #38bdf8; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-family: -apple-system, sans-serif;">
        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #38bdf8;">
          🛠️ Resend Sandbox Test Notification
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
          This message was originally addressed to customer: <strong style="color: #ffffff;">${to}</strong>.<br/>
          Rerouted to this inbox because <code>onboarding@resend.dev</code> only permits sending to the account owner.
        </p>
      </div>
    `;

    finalHtml = finalHtml.replace(
      '<!-- Body Content -->',
      `<!-- Body Content -->\n              ${sandboxNotice}`
    );
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: targetRecipient,
      subject: finalSubject,
      html: finalHtml,
    });

    if (error) {
      console.error(`[Email Service] Resend error delivering to ${targetRecipient}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service] Delivered email (ID: ${data?.id}) to ${targetRecipient} (Target: ${to})`);
    return { success: true, data };
  } catch (err: any) {
    console.error(`[Email Service] Exception delivering email to ${targetRecipient}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Password Reset instructions email
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const subject = "Reset your ABXV account password";
  const html = wrapEmailHtml(
    "Reset your password",
    `
    <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Password Reset Request</h1>
    <p style="margin: 0 0 20px 0; color: #cbd5e1;">We received a request to reset the password for your ABXV account. Click the secure button below to set a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background-color: #38bdf8; color: #0c1017; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);">
        Reset Password
      </a>
    </div>

    <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0 0;">
      This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
    </p>
    <p style="color: #64748b; font-size: 12px; margin: 16px 0 0 0; word-break: break-all;">
      Button not working? Copy and paste this link into your browser:<br/>
      <a href="${resetUrl}" style="color: #38bdf8; text-decoration: underline;">${resetUrl}</a>
    </p>
    `
  );

  return sendTransactionalEmail({ to: email, subject, html });
}

/**
 * Send Order Confirmation & Invoice receipt email
 */
export async function sendOrderConfirmationEmail(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true } },
        address: true,
        items: true,
      },
    });

    if (!order) {
      console.warn(`[Email Service] Cannot send order confirmation: Order ${orderId} not found`);
      return { success: false, error: "Order not found" };
    }

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.warn(`[Email Service] No recipient email found for Order ${orderId}`);
      return { success: false, error: "Recipient email missing" };
    }

    const recipientName = order.user?.name || order.guestName || "Valued Customer";
    const formattedTotal = `${order.currency} ${Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const formattedSubtotal = `${order.currency} ${Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const formattedShipping = Number(order.shipping) > 0 
      ? `${order.currency} ${Number(order.shipping).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : "FREE";
    const formattedDiscount = Number(order.discount) > 0 
      ? `-${order.currency} ${Number(order.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : null;

    const itemsHtml = order.items
      .map((item) => {
        const itemTotal = `${order.currency} ${(Number(item.price) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        return `
        <tr style="border-bottom: 1px solid #283347;">
          <td style="padding: 12px 0; color: #f1f5f9;">
            <div style="font-weight: 600;">${item.productName}</div>
            <div style="font-size: 13px; color: #94a3b8;">Size: ${item.size} | Color: ${item.color} &times; ${item.quantity}</div>
          </td>
          <td align="right" style="padding: 12px 0; color: #f1f5f9; font-weight: 600;">${itemTotal}</td>
        </tr>
      `;
      })
      .join("");

    const addressHtml = order.address
      ? `<p style="margin: 4px 0; color: #cbd5e1;">${order.address.fullName}<br/>${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ""}<br/>${order.address.city}, ${order.address.state} ${order.address.postalCode}<br/>${order.address.country}<br/>Phone: ${order.address.phone}</p>`
      : `<p style="margin: 4px 0; color: #94a3b8;">Standard Delivery</p>`;

    const html = wrapEmailHtml(
      `Order Confirmation #${order.orderNumber}`,
      `
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">Order Confirmed!</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px 0;">Thank you for your order, ${recipientName}. We are preparing your footwear atelier package.</p>
      
      <!-- Order Summary Card -->
      <div style="background-color: #0f141e; border: 1px solid #283347; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #94a3b8; font-size: 13px;">Order Number:</td>
            <td align="right" style="color: #38bdf8; font-weight: 700; font-size: 14px;">#${order.orderNumber}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; font-size: 13px; padding-top: 6px;">Payment Method:</td>
            <td align="right" style="color: #cbd5e1; font-size: 13px; padding-top: 6px;">${order.paymentMethod || "Standard"} (${order.paymentStatus})</td>
          </tr>
        </table>
      </div>

      <!-- Items Table -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #283347;">
            <th align="left" style="padding-bottom: 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Item</th>
            <th align="right" style="padding-bottom: 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Pricing Summary -->
      <div style="background-color: #0f141e; border: 1px solid #283347; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #94a3b8; font-size: 13px; padding-bottom: 6px;">Subtotal</td>
            <td align="right" style="color: #cbd5e1; font-size: 13px; padding-bottom: 6px;">${formattedSubtotal}</td>
          </tr>
          ${formattedDiscount ? `
          <tr>
            <td style="color: #10b981; font-size: 13px; padding-bottom: 6px;">Discount ${order.couponCode ? `(${order.couponCode})` : ""}</td>
            <td align="right" style="color: #10b981; font-size: 13px; padding-bottom: 6px;">${formattedDiscount}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="color: #94a3b8; font-size: 13px; padding-bottom: 6px;">Shipping</td>
            <td align="right" style="color: #cbd5e1; font-size: 13px; padding-bottom: 6px;">${formattedShipping}</td>
          </tr>
          <tr style="border-top: 1px solid #283347;">
            <td style="color: #ffffff; font-weight: 700; font-size: 16px; padding-top: 10px;">Total</td>
            <td align="right" style="color: #38bdf8; font-weight: 700; font-size: 18px; padding-top: 10px;">${formattedTotal}</td>
          </tr>
        </table>
      </div>

      <!-- Shipping Address -->
      <div style="background-color: #0f141e; border: 1px solid #283347; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
        <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">Delivery Address</h3>
        ${addressHtml}
      </div>

      <div style="text-align: center;">
        <a href="${appUrl}/account/orders/${order.id}" style="background-color: #38bdf8; color: #0c1017; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
          View Order Status
        </a>
      </div>
      `
    );

    return sendTransactionalEmail({
      to: recipientEmail,
      subject: `Order Confirmed: #${order.orderNumber} - ABXV Footwear`,
      html,
    });
  } catch (err: any) {
    console.error("[Email Service] Failed to send order confirmation:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Shipping / Status Update email
 */
export async function sendShippingUpdateEmail(orderId: string, statusNote?: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true } },
        address: true,
      },
    });

    if (!order) {
      console.warn(`[Email Service] Cannot send shipping update: Order ${orderId} not found`);
      return { success: false, error: "Order not found" };
    }

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      return { success: false, error: "Recipient email missing" };
    }

    const recipientName = order.user?.name || order.guestName || "Valued Customer";

    const html = wrapEmailHtml(
      `Update on Order #${order.orderNumber}`,
      `
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">Order Status Update</h1>
      <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 20px 0;">Hello ${recipientName}, your order status has been updated to <strong style="color: #38bdf8;">${order.status}</strong>.</p>
      
      <div style="background-color: #0f141e; border: 1px solid #283347; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #94a3b8;">Order Number: <strong style="color: #ffffff;">#${order.orderNumber}</strong></p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #94a3b8;">Current Status: <strong style="color: #38bdf8;">${order.status}</strong></p>
        ${statusNote ? `<p style="margin: 0; font-size: 13px; color: #e2e8f0; background-color: #1a2233; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #38bdf8;">Note: ${statusNote}</p>` : ""}
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/account/orders/${order.id}" style="background-color: #38bdf8; color: #0c1017; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
          Track Shipment
        </a>
      </div>
      `
    );

    return sendTransactionalEmail({
      to: recipientEmail,
      subject: `Order #${order.orderNumber} Status: ${order.status} - ABXV Footwear`,
      html,
    });
  } catch (err: any) {
    console.error("[Email Service] Failed to send shipping update email:", err);
    return { success: false, error: err.message };
  }
}
