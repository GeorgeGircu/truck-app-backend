const mongoose = require('mongoose');

const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
const JTI_MIN = 8;
const JTI_MAX = 128;

const planTypeEnum = ['free', 'basic', 'premium'];
const grantSourceEnum = ['subscription', 'rewarded_ad', 'trial', 'admin'];

/**
 * Sesiune navigație: grant temporar (JWT nav va include aceleași câmpuri + exp).
 * jti — identificator unic în claim-ul JWT pentru revoke / audit.
 */
const navigationSessionSchema = new mongoose.Schema(
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
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
      validate: {
        validator(v) {
          return COUNTRY_CODE_REGEX.test(v);
        },
        message: 'countryCode must be ISO 3166-1 alpha-2 (e.g. GB)',
      },
    },
    planType: {
      type: String,
      required: true,
      enum: planTypeEnum,
    },
    grantSource: {
      type: String,
      required: true,
      enum: grantSourceEnum,
    },
    rewardLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RewardLog',
      default: undefined,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: JTI_MIN,
      maxlength: JTI_MAX,
      match: /^[a-zA-Z0-9._-]+$/,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending_token', 'active', 'expired', 'revoked', 'ended'],
      default: 'active',
      index: true,
    },
    /**
     * Setat la emiterea JWT-ului de navigație (POST /start-session).
     * pending_token → null până la start-session.
     */
    navigationTokenIssuedAt: {
      type: Date,
      default: undefined,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

navigationSessionSchema.index({ userId: 1, deviceId: 1, status: 1 });
navigationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

navigationSessionSchema.pre('validate', function validateRewardGrant(next) {
  if (this.grantSource === 'rewarded_ad' && !this.rewardLogId) {
    return next(
      new Error('NavigationSession.rewardLogId is required when grantSource is rewarded_ad')
    );
  }
  next();
});

module.exports = mongoose.model('NavigationSession', navigationSessionSchema);
module.exports.NAV_PLAN_TYPES = planTypeEnum;
module.exports.NAV_GRANT_SOURCES = grantSourceEnum;
