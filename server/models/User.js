const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Do not return password by default in queries
    },
    avatar: {
      type: String,
      default: "/avatar.jpg",
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      sparse: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    preferences: {
      theme: { type: String, default: "dark" },
      defaultModel: { type: String, default: "Nebula 4.0e" },
      systemInstruction: { type: String, default: "" },
    },
    usage: {
      totalTokens: { type: Number, default: 0 },
      totalRequests: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Method to format public user JSON (stripping sensitive properties)
UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    provider: this.provider,
    plan: this.plan,
    preferences: this.preferences,
    usage: this.usage,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", UserSchema);

