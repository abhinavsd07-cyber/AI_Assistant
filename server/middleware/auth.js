const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const os = require("os");
const User = require("../models/User");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set in production; falling back to host-derived runtime secret.");
}

// Deterministic host-scoped fallback keeps dev/single-node sessions valid across restarts
const JWT_SECRET =
  process.env.JWT_SECRET ||
  crypto.createHash("sha256").update(`${__dirname}:${os.hostname()}:nebula_runtime_secret`).digest("hex");

// Middleware that strictly requires authentication
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please sign in.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Invalid authorization token format.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User account no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Session expired or invalid token. Please sign in again.",
    });
  }
};

// Middleware that attaches user if valid token exists, but doesn't block guests
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Ignore invalid tokens for optional auth
    req.user = null;
  }
  next();
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: "30d",
  });
};

module.exports = {
  requireAuth,
  optionalAuth,
  generateToken,
  JWT_SECRET,
};

