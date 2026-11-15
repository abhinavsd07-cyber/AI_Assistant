const nodemailer = require("nodemailer");

const DEFAULT_EMAIL_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzdSIg7LEfjwvMH8oL2wd5WWJgjpnmsbMHfs4AMHkFc2b7rkpIMqbRbMhw2GqkT5XI-/exec";

if (!process.env.EMAIL_WEBHOOK_URL) {
  process.env.EMAIL_WEBHOOK_URL = DEFAULT_EMAIL_WEBHOOK_URL;
}

function getEmailProvider() {
  const webhookUrl = (process.env.EMAIL_WEBHOOK_URL || "").trim();
  if (/^https:\/\//i.test(webhookUrl)) return "webhook";

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

function buildOtpEmailHtml({ to, code }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; color: #0D0D0D; border: 1px solid #E4E4E7; border-radius: 16px;">
      <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700;">Nebula AI Password Reset OTP</h2>
      <p style="margin: 0 0 16px; color: #52525B; font-size: 14px;">
        Enter the 6-digit verification OTP below on the Nebula AI verification screen to unlock password reset for <strong>${to}</strong>. This OTP expires in 15 minutes.
      </p>
      <div style="background: #F4F4F5; border: 1px solid #E4E4E7; border-radius: 12px; padding: 18px; text-align: center; font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0D0D0D;">
        ${code}
      </div>
      <p style="margin: 16px 0 0; color: #71717A; font-size: 12px;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `.trim();
}

/**
 * Dispatches a 6-digit password reset verification OTP using HTTPS Webhook,
 * SMTP (e.g. Gmail App Password), or Resend transactional email API.
 */
async function sendPasswordResetEmail({ to, code }) {
  const provider = getEmailProvider();
  if (!provider) {
    const err = new Error(
      "Password reset email delivery is not configured yet. Configure EMAIL_WEBHOOK_URL, SMTP_USER/SMTP_PASS, or RESEND_API_KEY on the server."
    );
    err.statusCode = 501;
    err.code = "EMAIL_DELIVERY_NOT_CONFIGURED";
    throw err;
  }

  const subject = `Nebula AI 6-Digit Verification OTP: ${code}`;
  const text = `Your Nebula AI 6-digit password reset OTP for ${to} is: ${code}\n\nThis OTP expires in 15 minutes. Enter and verify this OTP to set a new password.`;
  const html = buildOtpEmailHtml({ to, code });

  if (provider === "webhook") {
    const webhookUrl = (process.env.EMAIL_WEBHOOK_URL || "").trim();
    const webhookSecret = (process.env.EMAIL_WEBHOOK_SECRET || "").trim();
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        text,
        html,
        code,
        secret: webhookSecret || undefined,
      }),
      redirect: "follow",
    });

    if (!webhookRes.ok) {
      const err = new Error(
        `Email webhook returned HTTP ${webhookRes.status}. Verify your Google Apps Script Web App deployment is set to 'Anyone'.`
      );
      err.statusCode = 502;
      throw err;
    }
    return { provider: "webhook", deliveredTo: to, sandboxRedirected: false };
  }

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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    try {
      await transporter.sendMail({ from, to, subject, text, html });
      return { provider: "smtp", deliveredTo: to, sandboxRedirected: false };
    } catch (smtpErr) {
      const isPortBlocked = /ETIMEDOUT|ECONNREFUSED|ESOCKET/i.test(
        `${smtpErr?.code || ""} ${smtpErr?.message || ""}`
      );
      const err = new Error(
        isPortBlocked
          ? "Outbound SMTP port connection timed out (Render Free Tier blocks ports 25/465/587). Use EMAIL_WEBHOOK_URL (Google Apps Script HTTPS Web App) or Resend over HTTPS instead."
          : smtpErr?.message || "SMTP email dispatch failed."
      );
      err.statusCode = 502;
      throw err;
    }
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
        ? `Resend's free sandbox (onboarding@resend.dev) blocks sending OTP emails to ${to} unless you verify a custom domain. To send OTPs directly to ${to} (and any user's own email) for free without a domain, set EMAIL_WEBHOOK_URL (on Render) or SMTP_USER & SMTP_PASS (on localhost).`
        : rawMsg || "Unable to dispatch password reset OTP email right now. Please try again later."
    );
    err.statusCode = isOnboardingRestriction ? 403 : 502;
    throw err;
  }

  return { provider: "resend", deliveredTo: to, sandboxRedirected: false };
}

module.exports = {
  getEmailProvider,
  isEmailDeliveryConfigured,
  sendPasswordResetEmail,
};
