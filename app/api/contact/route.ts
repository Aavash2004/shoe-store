import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "ABXV Store <onboarding@resend.dev>";
const SUPPORT_DESTINATION_EMAIL = process.env.SUPPORT_EMAIL || "basnetaavash7@gmail.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, orderNumber, message } = body;

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name (minimum 2 characters)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json(
        { error: "Please enter a message (minimum 5 characters)." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOrderNumber = orderNumber ? String(orderNumber).trim() : null;
    const cleanMessage = message.trim();

    console.log(`[Contact Inquiry] From: ${cleanName} <${cleanEmail}> | Order: ${cleanOrderNumber || "None"} | Message: "${cleanMessage.slice(0, 60)}..."`);

    // If Resend is configured, send the notification email to support destination
    if (resend) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: SUPPORT_DESTINATION_EMAIL,
          subject: `[ABXV Inquiry] New message from ${cleanName}${cleanOrderNumber ? ` (Order #${cleanOrderNumber})` : ""}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
              <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">New Customer Inquiry</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Customer:</td>
                  <td style="padding: 8px 0;">${cleanName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${cleanEmail}">${cleanEmail}</a></td>
                </tr>
                ${
                  cleanOrderNumber
                    ? `<tr>
                        <td style="padding: 8px 0; font-weight: bold;">Order #:</td>
                        <td style="padding: 8px 0;">${cleanOrderNumber}</td>
                      </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })} (NPT)</td>
                </tr>
              </table>
              <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #0f172a;">
                <p style="margin: 0; font-weight: bold; font-size: 13px; color: #64748b; text-transform: uppercase;">Message Content:</p>
                <p style="margin-top: 8px; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${cleanMessage}</p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.warn("[Contact API] Could not dispatch Resend email, recorded in logs:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for reaching out! Your inquiry has been submitted successfully.",
    });
  } catch (error: any) {
    console.error("[Contact API] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while submitting your message. Please try again." },
      { status: 500 }
    );
  }
}
