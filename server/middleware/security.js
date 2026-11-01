/**
 * Nebula AI - Enterprise Security & Rate Limiting Middleware
 * Provides Helmet-grade HTTP security headers and sliding-window IP/User rate limiting.
 */

/**
 * Sets enterprise security headers on every response (Helmet standard)
 */
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.removeHeader("X-Powered-By");
  next();
}

/**
 * Creates a sliding-window rate limiter middleware
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests allowed per window
 * @param {string} options.message - Error message on 429
 */
function createRateLimiter({ windowMs = 60 * 1000, max = 60, message = "Too many requests, please try again shortly." } = {}) {
  const hits = new Map();

  // Periodic cleanup every 2 minutes to prevent memory bloat
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 120 * 1000);

  if (cleanup.unref) cleanup.unref();

  return function rateLimiterMiddleware(req, res, next) {
    const key = req.user?._id?.toString() || req.ip || req.headers["x-forwarded-for"] || "anonymous";
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      hits.set(key, record);
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(record.resetTime / 1000)));

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}

module.exports = {
  securityHeaders,
  createRateLimiter,
};

