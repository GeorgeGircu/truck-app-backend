const mongoose = require('mongoose');

const REFRESH_HASH_MIN = 32;
const REFRESH_HASH_MAX = 128;

/**
 * Sesiuni de autentificare (ex. refresh token rotit), legate de user + device.
 * Hash-ul tokenului nu trebuie expus în API; folosește select: false unde e cazul.
 */
const authSessionSchema = new mongoose.Schema(
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
    refreshTokenHash: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      select: false,
      minlength: REFRESH_HASH_MIN,
      maxlength: REFRESH_HASH_MAX,
    },
    /** JWT access claim `jti` — sesiuni doar cu access token (fără refresh). */
    accessJti: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 64,
    },
    /** Pentru rotație refresh: invalidare familie anterioară */
    tokenFamilyId: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 64,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: undefined,
    },
    ip: {
      type: String,
      default: undefined,
      maxlength: 45,
    },
    userAgent: {
      type: String,
      default: undefined,
      maxlength: 512,
    },
  },
  {
    timestamps: true,
  }
);

authSessionSchema.index({ userId: 1, deviceId: 1, createdAt: -1 });

/** Curățare automată a sesiunilor expirate (nu înlocuiește revoke explicit). */
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

authSessionSchema.pre('validate', function requireTokenRef(next) {
  if (!this.refreshTokenHash && !this.accessJti) {
    return next(new Error('AuthSession requires refreshTokenHash or accessJti'));
  }
  next();
});

module.exports = mongoose.model('AuthSession', authSessionSchema);
