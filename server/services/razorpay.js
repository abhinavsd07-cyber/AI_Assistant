const crypto = require("crypto");

/**
 * Nebula AI - Optional Razorpay Orders & Signature Verification Service
 * Activates automatically whenever RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * are configured in environment variables.
 */

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function isRazorpayConfigured(
  keyId = process.env.RAZORPAY_KEY_ID,
  keySecret = process.env.RAZORPAY_KEY_SECRET
) {
  return Boolean(
    typeof keyId === "string" &&
      keyId.trim() &&
      typeof keySecret === "string" &&
      keySecret.trim()
  );
}

function getRazorpayAmountPaise(billingCycle = "monthly") {
  return billingCycle === "annual" ? 599900 : 79900;
}

async function createRazorpayOrder({ billingCycle = "monthly", userId }) {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!isRazorpayConfigured(keyId, keySecret)) {
    throw new Error("Razorpay merchant credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured.");
  }

  const amount = getRazorpayAmountPaise(billingCycle);
  const authToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${String(userId || "usr").slice(-6)}`,
      notes: {
        platform: "Nebula AI",
        plan: "pro",
        billingCycle,
        userId: userId ? String(userId) : "",
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.description || "Failed to create Razorpay order");
  }

  return {
    orderId: data.id,
    amount: data.amount,
    currency: data.currency,
    keyId,
  };
}

function verifyRazorpaySignature(
  { orderId, paymentId, signature },
  keySecret = process.env.RAZORPAY_KEY_SECRET
) {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret.trim())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(String(signature).trim(), "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

module.exports = {
  isRazorpayConfigured,
  getRazorpayAmountPaise,
  createRazorpayOrder,
  verifyRazorpaySignature,
};
