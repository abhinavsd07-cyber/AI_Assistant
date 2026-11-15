const crypto = require("crypto");

/**
 * Nebula AI - Official Stripe REST API Integration (Sandbox & Production)
 * Creates and verifies PaymentIntents, Hosted Checkout Sessions, and Webhook
 * signatures in the connected Stripe account (Nebula_Ai) without extra SDK deps.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function isLiveStripeKey(secretKey = process.env.STRIPE_SECRET_KEY) {
  return typeof secretKey === "string" && (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_"));
}

function isSandboxStripeKey(secretKey = process.env.STRIPE_SECRET_KEY) {
  return typeof secretKey === "string" && (secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_"));
}

function getPlanPricing(billingCycle = "monthly") {
  const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase() === "inr" ? "inr" : "usd";
  const isAnnual = billingCycle === "annual";
  const amountMinor =
    currency === "inr"
      ? isAnnual
        ? 599900
        : 79900
      : isAnnual
        ? 5988
        : 999;
  const planName =
    currency === "inr"
      ? isAnnual
        ? "Nebula AI Pro — Annual Plan (₹5,999/year)"
        : "Nebula AI Pro — Monthly Plan (₹799/month)"
      : isAnnual
        ? "Nebula AI Pro — Annual Plan ($4.99/mo billed annually)"
        : "Nebula AI Pro — Monthly Plan ($9.99/mo)";

  return { currency, amountMinor, planName };
}

function toFormUrlEncoded(obj, prefix = "") {
  const params = new URLSearchParams();
  function build(data, keyPrefix) {
    if (data === null || data === undefined) return;
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const [k, v] of Object.entries(data)) {
        build(v, keyPrefix ? `${keyPrefix}[${k}]` : k);
      }
    } else if (Array.isArray(data)) {
      data.forEach((item, idx) => {
        build(item, `${keyPrefix}[${idx}]`);
      });
    } else {
      params.append(keyPrefix, String(data));
    }
  }
  build(obj, prefix);
  return params.toString();
}

/**
 * Creates and immediately confirms a real Sandbox PaymentIntent on Stripe
 * so the transaction appears immediately in the Stripe Dashboard under Transactions & Gross Volume.
 */
async function createConfirmedStripePayment({
  billingCycle = "monthly",
  customerEmail = "guest@nebula.ai",
  customerName = "Nebula AI User",
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in server/.env");
  }
  if (!isSandboxStripeKey(secretKey)) {
    throw new Error("Instant test-card confirmation is disabled in Live mode. Use Stripe Hosted Checkout.");
  }

  // Monthly = $9.99 USD (999 cents), Annual = $59.88 USD (5988 cents)
  const amountCents = billingCycle === "annual" ? 5988 : 999;

  const payload = {
    amount: amountCents,
    currency: "usd",
    payment_method: "pm_card_visa",
    confirm: "true",
    description: `Nebula AI Pro Subscription (${billingCycle.toUpperCase()}) - ${customerName}`,
    receipt_email: customerEmail.includes("@") ? customerEmail : undefined,
    automatic_payment_methods: {
      enabled: "true",
      allow_redirects: "never",
    },
    metadata: {
      platform: "Nebula AI",
      plan: "pro",
      billingCycle,
      customerName,
    },
  };

  const response = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toFormUrlEncoded(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe PaymentIntent creation failed");
  }

  return {
    paymentIntentId: data.id,
    status: data.status,
    amountFormatted: `$${(data.amount / 100).toFixed(2)} USD`,
    currency: data.currency,
    created: new Date(data.created * 1000).toISOString(),
  };
}

/**
 * Creates a real Stripe Hosted Checkout Session (checkout.stripe.com)
 */
async function createStripeCheckoutSession({
  billingCycle = "monthly",
  originUrl = "http://localhost:5173",
  customerEmail,
  userId,
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in server/.env");
  }

  const safeOrigin = String(originUrl || "http://localhost:5173").replace(/\/+$/, "");
  const { currency, amountMinor, planName } = getPlanPricing(billingCycle);

  const payload = {
    mode: "payment",
    success_url: `${safeOrigin}/?stripe_success=true&plan=pro&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${safeOrigin}/?stripe_canceled=true`,
    client_reference_id: userId ? String(userId) : undefined,
    customer_email: customerEmail && customerEmail.includes("@") ? customerEmail : undefined,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: planName,
            description:
              "Unlimited Gemini 3.8 & Ollama Llama 3.3, 1024x1024 FLUX.1 Node Studio, 3072-dim Vector RAG, and MemGPT Memory.",
          },
          unit_amount: amountMinor,
        },
        quantity: 1,
      },
    ],
    metadata: {
      platform: "Nebula AI",
      plan: "pro",
      billingCycle,
      userId: userId ? String(userId) : "",
    },
  };

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toFormUrlEncoded(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe Checkout Session creation failed");
  }

  return {
    sessionId: data.id,
    checkoutUrl: data.url,
    mode: isLiveStripeKey(secretKey) ? "live" : "sandbox",
  };
}

/**
 * Retrieves and normalizes a Stripe Checkout Session directly from Stripe API
 * so server endpoints never trust browser redirects without server verification.
 */
async function retrieveStripeCheckoutSession(sessionId) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in server/.env");
  }
  if (typeof sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId.trim())) {
    throw new Error("Invalid Stripe Checkout Session ID format.");
  }

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(sessionId.trim())}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to retrieve Stripe Checkout Session");
  }

  const currencyCode = String(data.currency || "usd").toUpperCase();
  const amountMajor = typeof data.amount_total === "number" ? (data.amount_total / 100).toFixed(2) : null;
  const amountFormatted = amountMajor
    ? `${currencyCode === "INR" ? "₹" : "$"}${amountMajor} ${currencyCode}`
    : undefined;

  return {
    id: data.id,
    status: data.status,
    paymentStatus: data.payment_status,
    amountTotal: data.amount_total,
    amountFormatted,
    currency: currencyCode,
    customerEmail: data.customer_details?.email || data.customer_email || null,
    clientReferenceId: data.client_reference_id || null,
    metadata: data.metadata || {},
  };
}

/**
 * Verifies Stripe-Signature HMAC-SHA256 webhook signature without extra SDK dependencies.
 */
function verifyStripeWebhookSignature(rawBody, signatureHeader, webhookSecret, toleranceSec = 300) {
  if (!rawBody || !signatureHeader || !webhookSecret) return false;
  const parts = String(signatureHeader)
    .split(",")
    .map((p) => p.trim())
    .reduce((acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) {
        if (!acc[k]) acc[k] = [];
        acc[k].push(v);
      }
      return acc;
    }, {});

  const timestamp = Number(parts.t?.[0]);
  const v1Signatures = parts.v1 || [];
  if (!timestamp || !v1Signatures.length) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;

  const payloadString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payloadString}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  return v1Signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, "hex");
      return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

module.exports = {
  isLiveStripeKey,
  isSandboxStripeKey,
  createConfirmedStripePayment,
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
  verifyStripeWebhookSignature,
};

