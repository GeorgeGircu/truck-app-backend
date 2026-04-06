const mongoose = require('mongoose');

const MAX_METADATA_KEYS = 32;
const MAX_METADATA_STRING_LEN = 256;

/**
 * Eveniment reward (ex. reclamă vizionată) care acordă o sesiune de navigație limitată (free).
 */
const rewardLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 128,
      match: /^[a-zA-Z0-9._@-]+$/,
    },
    provider: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 64,
    },
    placement: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 128,
    },
    rewardType: {
      type: String,
      required: true,
      enum: ['navigation_grant'],
      default: 'navigation_grant',
    },
    /** Legătură la sesiunea de navigație creată din acest reward. */
    navigationSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NavigationSession',
      default: undefined,
      index: true,
    },
    grantDurationSeconds: {
      type: Number,
      required: true,
      min: 1,
      max: 86400 * 7,
    },
    grantedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    metadata: {
      type: Map,
      of: String,
      default: undefined,
      validate: {
        validator(m) {
          if (!m || m.size === 0) return true;
          if (m.size > MAX_METADATA_KEYS) return false;
          for (const [, v] of m) {
            if (typeof v !== 'string' || v.length > MAX_METADATA_STRING_LEN) {
              return false;
            }
          }
          return true;
        },
        message: 'metadata too large or invalid',
      },
    },
  },
  {
    timestamps: true,
  }
);

rewardLogSchema.index({ userId: 1, deviceId: 1, createdAt: -1 });

module.exports = mongoose.model('RewardLog', rewardLogSchema);
