const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const ChatSession = require("../models/ChatSession");
const Memory = require("../models/Memory");
const UsageLog = require("../models/UsageLog");
const { requireAuth, generateToken, JWT_SECRET } = require("../middleware/auth");
const { isEmailDeliveryConfigured, sendPasswordResetEmail } = require("../services/email");

const router = express.Router();

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  "966040753081-ni3e6p4sen6pau4mb6eeeglmmfdjbe8g.apps.googleusercontent.com";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value) => typeof value === "string" && EMAIL_REGEX.test(value.trim());

// ==========================================
// 1. REGISTER (Email + Password)
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, error: "Full name is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return res.status(400).json({
        success: false,
        error: "Password must be between 6 and 128 characters long.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail }).select("+password");
    if (existingUser) {
      if (!existingUser.password && existingUser.provider === "google") {
        return res.status(409).json({
          success: false,
          error:
            "An account with this email already exists via Google. Click 'Continue with Google' to sign in, or use 'Forgot password?' to set a password.",
        });
      }
      return res.status(409).json({
        success: false,
        error: "An account with this email address already exists. Please sign in instead.",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Pick avatar based on name initials or default
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`;

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      avatar,
      provider: "local",
      hasPassword: true,
      plan: "free",
    });

    await user.save();

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to Nebula AI.",
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create account. Please try again.",
      details: error.message,
    });
  }
});

// ==========================================
// 2. LOGIN (Email + Password)
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe = true } = req.body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }

    if (typeof password !== "string" || !password) {
      return res.status(400).json({ success: false, error: "Password is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user and explicitly select password field
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password. Please check your credentials.",
      });
    }

    // Account created via Google OAuth with no password set
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error:
          "This account uses Google Sign-In. Click 'Continue with Google' or use 'Forgot password?' to set a password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password. Please check your credentials.",
      });
    }

    // Update last active
    user.usage.lastActive = new Date();
    await user.save();

    const token = generateToken(user._id, rememberMe === false ? "24h" : "30d");

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed. Please try again.",
      details: error.message,
    });
  }
});

// ==========================================
// 3. GOOGLE SIGN-IN (OAuth2 / ID Token & Access Token)
// ==========================================
router.post("/google", async (req, res) => {
  try {
    const { credential, accessToken, rememberMe = true } = req.body || {};

    let email = null;
    let emailVerified = false;
    let name = null;
    let picture = null;
    let googleId = null;

    if (credential) {
      if (!googleClient || !GOOGLE_CLIENT_ID) {
        return res.status(500).json({
          success: false,
          error: "Google OAuth Client ID is not configured on the server.",
        });
      }
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        emailVerified = payload.email_verified !== false;
        name = payload.name;
        picture = payload.picture;
        googleId = payload.sub;
      } catch (verifyErr) {
        return res.status(401).json({
          success: false,
          error: "Invalid or expired Google OAuth token. Please sign in again.",
        });
      }
    } else if (accessToken) {
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoRes.ok) {
          return res.status(401).json({
            success: false,
            error: "Invalid or expired Google OAuth access token. Please sign in again.",
          });
        }
        const userInfo = await userInfoRes.json();
        email = userInfo.email;
        emailVerified = userInfo.email_verified !== false;
        name = userInfo.name;
        picture = userInfo.picture;
        googleId = userInfo.sub;
      } catch (verifyErr) {
        return res.status(401).json({
          success: false,
          error: "Failed to verify Google OAuth token with Google servers.",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "Valid Google OAuth credential token is required.",
      });
    }

    if (!email || !emailVerified) {
      return res.status(400).json({
        success: false,
        error: "Google authentication failed: Email address could not be verified.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const lookupConditions = [{ email: normalizedEmail }];
    if (googleId) {
      lookupConditions.push({ googleId });
    }

    let user = await User.findOne({ $or: lookupConditions }).select("+password");

    if (user) {
      // Update googleId and Google profile picture (unless user uploaded a custom avatar)
      if (!user.googleId && googleId) user.googleId = googleId;
      if (
        picture &&
        (!user.avatar ||
          user.avatar === "/avatar.jpg" ||
          user.avatar.includes("dicebear.com") ||
          user.avatar.includes("googleusercontent.com"))
      ) {
        user.avatar = picture;
      }
      user.emailVerified = true;
      user.hasPassword = Boolean(user.hasPassword || user.password);
      user.usage.lastActive = new Date();
      await user.save();
    } else {
      // Create new Google user
      user = new User({
        name: name || "Nebula Explorer",
        email: normalizedEmail,
        avatar: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
        provider: "google",
        emailVerified: true,
        hasPassword: false,
        googleId: googleId || `g-${Date.now()}`,
        plan: "free",
      });
      await user.save();
    }

    const token = generateToken(user._id, rememberMe === false ? "24h" : "30d");

    return res.json({
      success: true,
      message: `Signed in as ${user.name}`,
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error("Google Auth error:", error);
    return res.status(500).json({
      success: false,
      error: "Google authentication could not be completed.",
      details: error.message,
    });
  }
});

// ==========================================
// 4. GET CURRENT USER PROFILE (/me)
// ==========================================
router.get("/me", requireAuth, async (req, res) => {
  try {
    const sessionCount = await ChatSession.countDocuments({ userId: req.user._id });

    return res.json({
      success: true,
      user: req.user.toPublicJSON(),
      stats: {
        totalSessions: sessionCount,
        totalRequests: req.user.usage.totalRequests || 0,
        totalTokens: req.user.usage.totalTokens || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. UPDATE USER PROFILE (Name, Avatar Photo & Preferences)
// ==========================================
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, avatar, preferences } = req.body;
    const user = req.user;

    if (name && name.trim()) user.name = name.trim();
    if (typeof avatar === "string") {
      if (avatar.startsWith("data:image/")) {
        try {
          const { uploadToCloudinary } = require("../services/cloudinary");
          const cdnUrl = await uploadToCloudinary(avatar, "nebula_ai/avatars");
          user.avatar = cdnUrl || avatar;
        } catch {
          user.avatar = avatar;
        }
      } else {
        user.avatar = avatar;
      }
    }
    if (preferences && typeof preferences === "object") {
      const nextPrefs = { ...(user.preferences?.toObject?.() || user.preferences || {}) };
      if (typeof preferences.theme === "string") nextPrefs.theme = preferences.theme.slice(0, 32);
      if (typeof preferences.defaultModel === "string") nextPrefs.defaultModel = preferences.defaultModel.slice(0, 100);
      if (typeof preferences.systemInstruction === "string") {
        nextPrefs.systemInstruction = preferences.systemInstruction.slice(0, 2000);
      }
      user.preferences = nextPrefs;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: user.toPublicJSON(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 6. CHANGE OR SET PASSWORD (Authenticated)
// ==========================================
router.put("/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        error: "New password must be between 6 and 128 characters long.",
      });
    }

    const userWithPassword = await User.findById(req.user._id).select("+password");
    if (!userWithPassword) {
      return res.status(404).json({ success: false, error: "User account not found." });
    }

    if (userWithPassword.password) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return res.status(400).json({
          success: false,
          error: "Current password is required to change your password.",
        });
      }
      const isMatch = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Current password is incorrect.",
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    userWithPassword.password = await bcrypt.hash(newPassword, salt);
    userWithPassword.hasPassword = true;
    await userWithPassword.save();

    return res.json({
      success: true,
      message: "Password updated successfully.",
      user: userWithPassword.toPublicJSON(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 7. FORGOT PASSWORD, VERIFY 6-DIGIT OTP & RESET PASSWORD
// ==========================================
router.post("/forgot-password", async (req, res) => {
  try {
    if (!isValidEmail(req.body?.email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }
    const email = req.body.email.toLowerCase().trim();

    if (!isEmailDeliveryConfigured()) {
      return res.status(501).json({
        success: false,
        code: "EMAIL_DELIVERY_NOT_CONFIGURED",
        error:
          "Password reset email delivery is not configured on this server yet. Please sign in with Google or change your password inside Settings while signed in.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        code: "ACCOUNT_NOT_FOUND",
        error: "No account found with this email address. Please check the email or create a new account.",
      });
    }

    const rawOtp = String(crypto.randomInt(100000, 1000000));
    user.resetTokenHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    let delivery;
    try {
      delivery = await sendPasswordResetEmail({ to: email, code: rawOtp });
    } catch (mailErr) {
      console.warn("Forgot-password OTP dispatch notice:", mailErr.message);
      return res.status(mailErr.statusCode || 502).json({
        success: false,
        code: mailErr.code,
        error: mailErr.message,
      });
    }

    return res.json({
      success: true,
      email,
      deliveredTo: delivery?.deliveredTo || email,
      sandboxRedirected: Boolean(delivery?.sandboxRedirected),
      message: delivery?.sandboxRedirected
        ? `6-digit OTP sent! (Routed via Resend Sandbox to ${delivery.deliveredTo} for ${email})`
        : `A 6-digit verification OTP has been sent to ${email}.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    if (!isValidEmail(req.body?.email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }
    const email = req.body.email.toLowerCase().trim();
    const otp = String(req.body?.otp || req.body?.code || "").trim();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid 6-digit numeric OTP.",
      });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      email,
      resetTokenHash: otpHash,
      resetTokenExpires: { $gt: new Date() },
    }).select("+resetTokenHash +resetTokenExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired 6-digit OTP. Please check your email and try again.",
      });
    }

    const resetSessionToken = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        purpose: "password_reset_verified",
        otpHash: user.resetTokenHash,
      },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.json({
      success: true,
      email: user.email,
      resetSessionToken,
      message: "OTP verified successfully! You can now set your new password.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    if (!isValidEmail(req.body?.email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }
    const email = req.body.email.toLowerCase().trim();
    const resetSessionToken =
      typeof req.body?.resetSessionToken === "string" ? req.body.resetSessionToken.trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    const newPassword = req.body?.newPassword;

    if (!resetSessionToken && !code) {
      return res.status(400).json({
        success: false,
        error: "OTP verification is required before setting a new password.",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        error: "New password must be between 6 and 128 characters long.",
      });
    }

    let user = null;

    if (resetSessionToken) {
      let decoded;
      try {
        decoded = jwt.verify(resetSessionToken, JWT_SECRET);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Your OTP verification session has expired. Please request and verify a new OTP.",
        });
      }

      if (
        !decoded ||
        decoded.purpose !== "password_reset_verified" ||
        decoded.email !== email ||
        typeof decoded.otpHash !== "string"
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid OTP verification token. Please verify your OTP again.",
        });
      }

      user = await User.findOne({
        _id: decoded.sub,
        email,
        resetTokenHash: decoded.otpHash,
        resetTokenExpires: { $gt: new Date() },
      }).select("+password +resetTokenHash +resetTokenExpires");
    } else {
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      user = await User.findOne({
        email,
        resetTokenHash: codeHash,
        resetTokenExpires: { $gt: new Date() },
      }).select("+password +resetTokenHash +resetTokenExpires");
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP verification session. Please request a new OTP.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.hasPassword = true;
    user.emailVerified = true;
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 8. DELETE ACCOUNT & USER DATA (GDPR)
// ==========================================
router.delete("/account", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    await Promise.all([
      ChatSession.deleteMany({ userId }),
      Memory.deleteMany({ userId }),
      UsageLog.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    return res.json({
      success: true,
      message: "Account and associated workspace data permanently deleted.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

