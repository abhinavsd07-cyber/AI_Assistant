/**
 * Nebula AI - Official Stripe REST API Integration (Sandbox & Production)
 * Creates real PaymentIntents and Hosted Checkout Sessions in the connected
 * Stripe account (Nebula_Ai sandbox) without requiring extra SDK dependencies.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";

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
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in server/.env");
  }

  const amountCents = billingCycle === "annual" ? 5988 : 999;
  const planName =
    billingCycle === "annual"
      ? "Nebula AI Pro — Annual Plan ($4.99/mo billed annually)"
      : "Nebula AI Pro — Monthly Plan ($9.99/mo)";

  const payload = {
    mode: "payment",
    success_url: `${originUrl}/?stripe_success=true&plan=pro`,
    cancel_url: `${originUrl}/?stripe_canceled=true`,
    customer_email: customerEmail && customerEmail.includes("@") ? customerEmail : undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: planName,
            description:
              "Unlimited Gemini 3.8 & Ollama Llama 3.3, 1024x1024 FLUX.1 Node Studio, 3072-dim Vector RAG, and MemGPT Memory.",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      platform: "Nebula AI",
      plan: "pro",
      billingCycle,
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
  };
}

module.exports = {
  createConfirmedStripePayment,
  createStripeCheckoutSession,
};
