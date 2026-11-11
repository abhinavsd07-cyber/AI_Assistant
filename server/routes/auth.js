const express = require("express");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const ChatSession = require("../models/ChatSession");
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

    let user = await User.findOne({
      $or: [{ email: normalizedEmail }, { googleId }],
    });

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
      user.usage.lastActive = new Date();
      await user.save();
    } else {
      // Create new Google user
      user = new User({
        name: name || "Nebula Explorer",
        email: normalizedEmail,
        avatar: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
        provider: "google",
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
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
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

module.exports = router;

