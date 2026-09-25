import { Resend } from "resend";

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ABXV Store <onboarding@resend.dev>";
  const to = "basnetaavash7@gmail.com";

  console.log("==========================================");
  console.log("Testing Resend API Service");
  console.log("==========================================");
  console.log("API Key configured:", apiKey ? `${apiKey.slice(0, 8)}...` : "NONE");
  console.log("From:", from);
  console.log("To:", to);

  if (!apiKey) {
    console.error("❌ RESEND_API_KEY is not defined in environment.");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: `Resend Health Check - ${new Date().toLocaleTimeString()}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #38bdf8;">Resend Integration Active!</h2>
          <p>This is a live test email sent directly from your shoe-store application via Resend API.</p>
          <p style="color: #94a3b8; font-size: 13px;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log("Resend API Response:", JSON.stringify(result, null, 2));

    if (result.error) {
      console.error("❌ Resend returned an error:", result.error);
      process.exit(1);
    } else {
      console.log(`🎉 SUCCESS! Email dispatched. ID: ${result.data?.id}`);
    }
  } catch (err: any) {
    console.error("❌ Exception during send:", err);
    process.exit(1);
  }
}

testResend();
