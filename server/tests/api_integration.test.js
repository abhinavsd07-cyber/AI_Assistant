const { describe, it, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const { app, isOriginAllowed, isProUser, buildSubscriptionFields } = require("../server");
const { generateToken, JWT_SECRET } = require("../middleware/auth");
const { getEmailProvider, isEmailDeliveryConfigured } = require("../services/email");
const { createRateLimiter } = require("../middleware/security");
const {
  isLiveStripeKey,
  isSandboxStripeKey,
  retrieveStripeCheckoutSession,
  verifyStripeWebhookSignature,
} = require("../services/stripe");
const {
  isRazorpayConfigured,
  verifyRazorpaySignature,
} = require("../services/razorpay");

describe("Nebula AI Full-Stack HTTP & Security Integration Suite", () => {
  let server;
  let baseUrl;

  const savedEnv = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
  };

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    server?.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("GET /api/health returns 200 and OWASP security headers", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(res.headers.get("x-powered-by"), null);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.status, "healthy");
    assert.equal(data.modelsReady, true);
  });

  it("CORS whitelist allows trusted origins and omits Access-Control-Allow-Origin for untrusted sites", async () => {
    assert.equal(isOriginAllowed("https://nebula-ai-assistant.onrender.com"), true);
    assert.equal(isOriginAllowed("http://localhost:5173"), true);
    assert.equal(isOriginAllowed("https://evil.example.org"), false);

    const allowedRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: "https://nebula-ai-assistant.onrender.com" },
    });
    assert.equal(
      allowedRes.headers.get("access-control-allow-origin"),
      "https://nebula-ai-assistant.onrender.com"
    );

    const blockedRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: "https://evil.example.org" },
    });
    assert.equal(blockedRes.headers.get("access-control-allow-origin"), null);
  });

  it("GET /api/payments/status detects Stripe Sandbox, Live, Unconfigured, and Razorpay states", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example_key_for_ci";
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    let res = await fetch(`${baseUrl}/api/payments/status`);
    let body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.mode, "sandbox");
    assert.equal(body.checkoutEnabled, true);
    assert.equal(body.razorpayEnabled, false);

    process.env.STRIPE_SECRET_KEY = "rk_live_example_key_for_ci";
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
    res = await fetch(`${baseUrl}/api/payments/status`);
    body = await res.json();
    assert.equal(body.mode, "live");
    assert.equal(body.razorpayEnabled, true);

    process.env.STRIPE_SECRET_KEY = "";
    res = await fetch(`${baseUrl}/api/payments/status`);
    body = await res.json();
    assert.equal(body.mode, "unconfigured");
    assert.equal(body.stripeConfigured, false);
  });

  it("POST /api/payments/webhook fails closed without secret, rejects bad HMAC, and accepts valid HMAC-SHA256", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const payload = JSON.stringify({
      id: "evt_test_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1", payment_status: "paid" } },
    });

    const missingSecretRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    assert.equal(missingSecretRes.status, 503);

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_integration_test_secret";
    const badSigRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": "t=1700000000,v1=deadbeef",
      },
      body: payload,
    });
    assert.equal(badSigRes.status, 400);

    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto
      .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
      .update(`${ts}.${payload}`)
      .digest("hex");

    const validRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": `t=${ts},v1=${sig}`,
      },
      body: payload,
    });
    assert.equal(validRes.status, 200);
    const validBody = await validRes.json();
    assert.equal(validBody.received, true);
    assert.equal(verifyStripeWebhookSignature(payload, `t=${ts},v1=${sig}`, process.env.STRIPE_WEBHOOK_SECRET), true);
  });

  it("Rejects unauthenticated requests across protected endpoints with HTTP 401", async () => {
    const protectedEndpoints = [
      ["GET", "/api/auth/me"],
      ["PUT", "/api/auth/password"],
      ["DELETE", "/api/auth/account"],
      ["GET", "/api/payments/subscription"],
      ["POST", "/api/payments/cancel"],
      ["POST", "/api/payments/upgrade"],
      ["POST", "/api/payments/create-checkout-session"],
      ["POST", "/api/payments/verify-checkout-session"],
      ["POST", "/api/chat"],
      ["POST", "/api/flux/workflow"],
    ];

    for (const [method, endpoint] of protectedEndpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify({}),
      });
      assert.equal(res.status, 401, `${method} ${endpoint} should require authentication`);
    }
  });

  it("Validates auth inputs, email formats, JWT session lifetimes, and forgot-password unconfigured fallback", async () => {
    const shortPassRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "test@example.com", password: "123" }),
    });
    assert.equal(shortPassRes.status, 400);

    for (const [endpoint, body] of [
      ["/api/auth/register", { name: "Test", email: "not-an-email", password: "password123" }],
      ["/api/auth/login", { email: "bad@", password: "password123" }],
      ["/api/auth/forgot-password", { email: "missing-domain@localhost" }],
      ["/api/auth/reset-password", { email: "bad", code: "ABCD1234", newPassword: "password123" }],
      ["/api/auth/reset-password", { email: "user@example.com", code: "", newPassword: "password123" }],
      ["/api/auth/reset-password", { email: "user@example.com", code: "ABCD1234", newPassword: "123" }],
    ]) {
      const badRes = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(badRes.status, 400, `${endpoint} should reject invalid payload`);
    }

    const shortSession = jwt.verify(generateToken("user-1", "24h"), JWT_SECRET);
    const longSession = jwt.verify(generateToken("user-1"), JWT_SECRET);
    assert.equal(shortSession.exp - shortSession.iat, 24 * 60 * 60);
    assert.equal(longSession.exp - longSession.iat, 30 * 24 * 60 * 60);

    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    assert.equal(isEmailDeliveryConfigured(), false);
    assert.equal(getEmailProvider(), null);

    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    assert.equal(forgotRes.status, 501);
    const forgotData = await forgotRes.json();
    assert.equal(forgotData.code, "EMAIL_DELIVERY_NOT_CONFIGURED");

    process.env.RESEND_API_KEY = "re_test_123";
    assert.equal(isEmailDeliveryConfigured(), true);
    assert.equal(getEmailProvider(), "resend");

    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app_password_123";
    assert.equal(getEmailProvider(), "smtp");
  });

  it("Validates Stripe key classifiers, session ID format, Razorpay HMAC, subscription builder, and Pro rate limits", async () => {
    assert.equal(isSandboxStripeKey("sk_test_123"), true);
    assert.equal(isLiveStripeKey("rk_live_123"), true);
    assert.equal(isLiveStripeKey("sk_test_123"), false);

    process.env.STRIPE_SECRET_KEY = "sk_test_ci";
    await assert.rejects(() => retrieveStripeCheckoutSession("invalid_id"), /Invalid Stripe Checkout Session ID/);

    assert.equal(isRazorpayConfigured("key", "sec"), true);
    assert.equal(isRazorpayConfigured("", "sec"), false);
    const orderId = "order_123";
    const paymentId = "pay_456";
    const validRzpSig = crypto.createHmac("sha256", "rzp_secret").update(`${orderId}|${paymentId}`).digest("hex");
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: validRzpSig }, "rzp_secret"), true);
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: "0000" }, "rzp_secret"), false);

    assert.equal(isProUser({ plan: "free" }), false);
    assert.equal(isProUser({ plan: "pro" }), true);
    const annualFields = buildSubscriptionFields({ billingCycle: "annual", gateway: "stripe", receiptId: "cs_test_1" });
    assert.equal(annualFields.plan, "pro");
    assert.equal(annualFields["subscription.billingCycle"], "annual");
    assert.equal(annualFields["subscription.status"], "active");

    // Verify dynamic tier rate limiter enforces Free (2) vs Pro (5) limits
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: (req) => (isProUser(req.user) ? 5 : 2),
      message: "Limit reached",
    });

    const invokeLimiter = (user) =>
      new Promise((resolve) => {
        const headers = {};
        let status = 200;
        const req = { user, ip: "127.0.0.1", headers: {} };
        const res = {
          setHeader(k, v) { headers[k] = v; },
          status(code) { status = code; return this; },
          json(payload) { resolve({ status, headers, payload }); return this; },
        };
        limiter(req, res, () => resolve({ status: 200, headers }));
      });

    const freeUser = { _id: "free-user-1", plan: "free" };
    assert.equal((await invokeLimiter(freeUser)).status, 200);
    assert.equal((await invokeLimiter(freeUser)).status, 200);
    const freeBlocked = await invokeLimiter(freeUser);
    assert.equal(freeBlocked.status, 429);
    assert.equal(freeBlocked.headers["X-RateLimit-Limit"], "2");

    const proUser = { _id: "pro-user-1", plan: "pro" };
    const proOk = await invokeLimiter(proUser);
    assert.equal(proOk.status, 200);
    assert.equal(proOk.headers["X-RateLimit-Limit"], "5");
  });
});
