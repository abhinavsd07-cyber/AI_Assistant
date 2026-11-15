const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const ChatSession = require("../models/ChatSession");
const Memory = require("../models/Memory");
const UsageLog = require("../models/UsageLog");
const { requireAuth, generateToken } = require("../middleware/auth");

const router = express.Router();

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  "966040753081-ni3e6p4sen6pau4mb6eeeglmmfdjbe8g.apps.googleusercontent.com";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// ==========================================
// 1. REGISTER (Email + Password)
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Name is required." });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: "Valid email address is required." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
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
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: "Email address is required." });
    }

    if (!password) {
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
        error: "This account was registered with Google. Please use 'Continue with Google' to sign in.",
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

    const token = generateToken(user._id);

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
    const { credential, accessToken } = req.body;

    let email = null;
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

    if (!email) {
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

    let user = await User.findOne({ $or: lookupConditions });

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

    const token = generateToken(user._id);

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

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long.",
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
// 7. FORGOT & RESET PASSWORD (Email Token)
// ==========================================
router.post("/forgot-password", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required." });
    }

    const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
    if (!resendApiKey) {
      return res.status(501).json({
        success: false,
        code: "EMAIL_DELIVERY_NOT_CONFIGURED",
        error:
          "Password reset email delivery is not configured on this server yet. Please sign in with Google or change your password inside Settings while signed in.",
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      const rawCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      user.resetTokenHash = crypto.createHash("sha256").update(rawCode).digest("hex");
      user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      const fromEmail = (process.env.RESEND_FROM_EMAIL || "Nebula AI <no-reply@nebula.ai>").trim();
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: "Nebula AI Password Reset Code",
          text: `Your Nebula AI password reset code is: ${rawCode}\n\nThis code expires in 15 minutes. If you did not request this, ignore this email.`,
        }),
      });

      if (!emailRes.ok) {
        return res.status(502).json({
          success: false,
          error: "Unable to dispatch password reset email right now. Please try again later.",
        });
      }
    }

    return res.json({
      success: true,
      message: "If an account exists for that email, a 15-minute reset code has been sent.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    const newPassword = req.body?.newPassword;

    if (!email || !code || !newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Email, reset code, and a new password (min 6 characters) are required.",
      });
    }

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const user = await User.findOne({
      email,
      resetTokenHash: codeHash,
      resetTokenExpires: { $gt: new Date() },
    }).select("+password +resetTokenHash +resetTokenExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset code.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.hasPassword = true;
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

