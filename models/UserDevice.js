const mongoose = require('mongoose');

const DEVICE_ID_MIN = 8;
const DEVICE_ID_MAX = 128;

/**
 * O înregistrare per pereche (userId, deviceId).
 * premiumBindingStatus: 'active' apare pe cel mult un device per user (index parțial unique).
 */
const pendingTransferSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    initiatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const userDeviceSchema = new mongoose.Schema(
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
      minlength: DEVICE_ID_MIN,
      maxlength: DEVICE_ID_MAX,
      match: /^[a-zA-Z0-9._@-]+$/,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web', 'unknown'],
      default: 'unknown',
    },
    appVersion: {
      type: String,
      default: undefined,
      maxlength: 64,
      trim: true,
    },
    /** Din deviceInfo.model (client) — nume prietenos / model. */
    deviceLabel: {
      type: String,
      default: undefined,
      maxlength: 200,
      trim: true,
    },
    /** Stare legată de slotul premium pentru acest device (nu înseamnă că userul are premium — verifică și User.subscriptionPlan). */
    premiumBindingStatus: {
      type: String,
      enum: ['none', 'active', 'revoked', 'pending_transfer'],
      default: 'none',
    },
    pendingTransfer: {
      type: pendingTransferSchema,
      default: undefined,
    },
    lastAuthAt: {
      type: Date,
      default: undefined,
    },
    lastNavigationAt: {
      type: Date,
      default: undefined,
    },
    revokedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

userDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

userDeviceSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { premiumBindingStatus: 'active' },
    name: 'uid_one_active_premium_device',
  }
);

module.exports = mongoose.model('UserDevice', userDeviceSchema);
