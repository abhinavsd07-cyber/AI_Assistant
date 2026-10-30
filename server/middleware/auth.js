const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "nebula_ai_assistant_jwt_secret_key_2026_super_secure";

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

