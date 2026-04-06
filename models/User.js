const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    verificationCode: {
      type: String,
      default: undefined,
    },
    verificationCodeExpire: {
      type: Date,
      default: undefined,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    /**
     * Plan comercial (sursă pentru planType în JWT-uri de navigație).
     * Lipsă la documente vechi = tratează ca 'free' în aplicație.
     */
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
    },
    premiumActivatedAt: {
      type: Date,
      default: undefined,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpire: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);