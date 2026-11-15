const nodemailer = require("nodemailer");

function getEmailProvider() {
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").trim();
  if (smtpUser && smtpPass) return "smtp";

  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (resendKey) return "resend";

  return null;
}

function isEmailDeliveryConfigured() {
  return getEmailProvider() !== null;
}

/**
 * Dispatches a password reset verification email using SMTP (e.g. Gmail App Password)
 * or Resend transactional email API when configured.
 */
async function sendPasswordResetEmail({ to, code }) {
  const provider = getEmailProvider();
  if (!provider) {
    const err = new Error(
      "Password reset email delivery is not configured yet. Configure SMTP_USER/SMTP_PASS (e.g. Gmail App Password) or RESEND_API_KEY on the server."
    );
    err.statusCode = 501;
    err.code = "EMAIL_DELIVERY_NOT_CONFIGURED";
    throw err;
  }

  const subject = "Nebula AI Password Reset Code";
  const text = `Your Nebula AI password reset code is: ${code}\n\nThis code expires in 15 minutes. If you did not request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; color: #0D0D0D;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">Nebula AI Password Reset</h2>
      <p style="margin: 0 0 16px; color: #52525B; font-size: 14px;">Use the verification code below to reset your password. This code expires in 15 minutes.</p>
      <div style="background: #F4F4F5; border: 1px solid #E4E4E7; border-radius: 12px; padding: 16px; text-align: center; font-family: monospace; font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #0D0D0D;">
        ${code}
      </div>
      <p style="margin: 16px 0 0; color: #71717A; font-size: 12px;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `.trim();

  if (provider === "smtp") {
    const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = Number(process.env.SMTP_PORT || 465);
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();
    const from = (process.env.SMTP_FROM_EMAIL || `Nebula AI <${user}>`).trim();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({ from, to, subject, text, html });
    return { provider: "smtp" };
  }

  const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || "Nebula AI <onboarding@resend.dev>").trim();

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!emailRes.ok) {
    const errPayload = await emailRes.json().catch(() => null);
    const rawMsg = errPayload?.message || "";
    const isOnboardingRestriction =
      emailRes.status === 403 && /testing emails|verify a domain/i.test(rawMsg);

    const err = new Error(
      isOnboardingRestriction
        ? "Resend test mode only delivers to your own Resend account email. To send reset codes to any user email, verify a domain in Resend or add Gmail SMTP credentials (SMTP_USER & SMTP_PASS) in Render."
        : rawMsg || "Unable to dispatch password reset email right now. Please try again later."
    );
    err.statusCode = isOnboardingRestriction ? 403 : 502;
    throw err;
  }

  return { provider: "resend" };
}

module.exports = {
  getEmailProvider,
  isEmailDeliveryConfigured,
  sendPasswordResetEmail,
};
