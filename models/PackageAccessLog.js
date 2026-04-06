const mongoose = require('mongoose');

const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

const packageActionEnum = [
  'catalog_view',
  'download_started',
  'download_complete',
  'download_failed',
  'unlock_attempt',
  'unlock_success',
  'unlock_denied',
];

/**
 * Audit opțional: acces la pachete pe țară (descărcare / deblocare).
 */
const packageAccessLogSchema = new mongoose.Schema(
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
      default: undefined,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
      validate: {
        validator(v) {
          if (v == null || v === '') return true;
          return COUNTRY_CODE_REGEX.test(v);
        },
        message: 'countryCode must be ISO 3166-1 alpha-2 when set',
      },
    },
    action: {
      type: String,
      required: true,
      enum: packageActionEnum,
    },
    packageId: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 128,
    },
    packageVersion: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 64,
    },
    httpStatus: {
      type: Number,
      default: undefined,
      min: 100,
      max: 599,
    },
    errorCode: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 64,
    },
    navigationSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NavigationSession',
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

packageAccessLogSchema.index({ userId: 1, countryCode: 1, createdAt: -1 });
packageAccessLogSchema.index({ countryCode: 1, action: 1, createdAt: -1 });

packageAccessLogSchema.pre('validate', function packageCountryRule(next) {
  const needsCountry = [
    'download_started',
    'download_complete',
    'download_failed',
    'unlock_attempt',
    'unlock_success',
    'unlock_denied',
  ].includes(this.action);
  if (needsCountry && !this.countryCode) {
    return next(new Error('PackageAccessLog.countryCode is required for this action'));
  }
  next();
});

module.exports = mongoose.model('PackageAccessLog', packageAccessLogSchema);
module.exports.PACKAGE_ACCESS_ACTIONS = packageActionEnum;
