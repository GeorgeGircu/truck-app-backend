const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const UserDevice = require('../models/UserDevice');
const AuthSession = require('../models/AuthSession');
const {
  sendVerificationEmail,
  sendResetEmail,
} = require('../utils/emailService');
const {
  isPremiumPlan,
  randomTokenHex,
  hashSecret,
  evaluatePremiumLoginForNewDevice,
} = require('../utils/deviceSessionHelpers');
const { normalizeDeviceInfo } = require('../middleware/validateLoginDevice');

const ACCESS_MS = 7 * 24 * 60 * 60 * 1000;

function accessSessionExpiresAt() {
  return new Date(Date.now() + ACCESS_MS);
}

/** Token legacy: doar `{ id }`. Cu device: `{ id, jti, deviceId }` pentru binding + logout. */
function generateToken(userId, opts = {}) {
  const payload = { id: String(userId) };
  if (opts.jti) payload.jti = opts.jti;
  if (opts.deviceId) payload.deviceId = opts.deviceId;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function subscriptionPlanOf(user) {
  return user.subscriptionPlan || 'free';
}

const registerUser = async (req, res) => {
  let user = null;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('=== REGISTER START ===');
    console.log('Email:', normalizedEmail);

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        code: 'USER_ALREADY_EXISTS',
      });
    }

    if (existingUser && !existingUser.isVerified) {
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      existingUser.password = await bcrypt.hash(password, 10);
      existingUser.verificationCode = verificationCode;
      existingUser.verificationCodeExpire = Date.now() + 10 * 60 * 1000;

      await existingUser.save();

      console.log('Existing unverified user found, resending code...');
      await sendVerificationEmail(existingUser.email, verificationCode);

      return res.status(200).json({
        code: 'VERIFICATION_RESENT',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          isVerified: existingUser.isVerified,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpire: Date.now() + 10 * 60 * 1000,
      isVerified: false,
    });

    console.log('User created in Mongo:', user.email);
    console.log('Sending verification email...');

    await sendVerificationEmail(user.email, verificationCode);

    console.log('Verification email sent successfully');

    return res.status(201).json({
      code: 'REGISTER_SUCCESS',
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error(
      'REGISTER ERROR FULL:',
      error.response?.data || error.message || error
    );

    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
        console.log('Rollback successful: user deleted');
      } catch (deleteError) {
        console.error('Rollback delete error:', deleteError);
      }
    }

    return res.status(500).json({
      code: 'SERVER_ERROR',
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
      verificationCode: code,
      verificationCodeExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        code: 'INVALID_OR_EXPIRED_CODE',
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;

    await user.save();

    return res.status(200).json({
      code: 'EMAIL_VERIFIED',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      code: 'SERVER_ERROR',
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        code: 'EMAIL_REQUIRED',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
      });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    user.verificationCode = verificationCode;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    await sendVerificationEmail(user.email, verificationCode);

    return res.status(200).json({
      code: 'CODE_RESENT',
    });
  } catch (error) {
    console.error('Resend code error:', error);
    return res.status(500).json({
      code: 'SERVER_ERROR',
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, deviceId, deviceInfo } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (deviceId === undefined || deviceId === null || deviceId === '') {
      return res.status(200).json({
        code: 'LOGIN_SUCCESS',
        token: generateToken(user._id),
        user: {
          id: user._id,
          email: user.email,
          isVerified: user.isVerified,
        },
        legacyAuth: true,
      });
    }

    const deviceIdStr = String(deviceId).trim();
    const info =
      req.normalizedDeviceInfo || normalizeDeviceInfo(deviceInfo);

    const plan = subscriptionPlanOf(user);

    const activePremiumDevice = await UserDevice.findOne({
      userId: user._id,
      premiumBindingStatus: 'active',
    });

    if (isPremiumPlan(plan)) {
      const decision = evaluatePremiumLoginForNewDevice({
        userSubscriptionPlan: plan,
        requestingDeviceId: deviceIdStr,
        activePremiumDeviceRow: activePremiumDevice
          ? {
              deviceId: activePremiumDevice.deviceId,
              premiumBindingStatus: activePremiumDevice.premiumBindingStatus,
              pendingTransfer: activePremiumDevice.pendingTransfer,
            }
          : null,
      });

      if (decision.code === 'DEVICE_ALREADY_BOUND') {
        return res.status(403).json({
          code: 'DEVICE_ALREADY_BOUND',
          message:
            'Premium is already linked to another device. Use device transfer or login from that device.',
        });
      }
      if (decision.code === 'TRANSFER_REQUIRED') {
        return res.status(403).json({
          code: 'TRANSFER_REQUIRED',
          message:
            'A device transfer was started. Complete it on this device using the transfer token.',
        });
      }
    }

    const freshActive = await UserDevice.findOne({
      userId: user._id,
      premiumBindingStatus: 'active',
    });

    if (isPremiumPlan(plan)) {
      if (!freshActive) {
        await UserDevice.findOneAndUpdate(
          { userId: user._id, deviceId: deviceIdStr },
          {
            $set: {
              userId: user._id,
              deviceId: deviceIdStr,
              platform: info.platform,
              deviceLabel: info.deviceLabel,
              appVersion: info.appVersion,
              premiumBindingStatus: 'active',
              lastAuthAt: new Date(),
            },
            $unset: { pendingTransfer: '' },
          },
          { upsert: true, new: true, runValidators: true }
        );
      } else if (freshActive.deviceId === deviceIdStr) {
        await UserDevice.findOneAndUpdate(
          { userId: user._id, deviceId: deviceIdStr },
          {
            $set: {
              userId: user._id,
              deviceId: deviceIdStr,
              platform: info.platform,
              deviceLabel: info.deviceLabel,
              appVersion: info.appVersion,
              premiumBindingStatus: 'active',
              lastAuthAt: new Date(),
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
      }
    } else {
      await UserDevice.findOneAndUpdate(
        { userId: user._id, deviceId: deviceIdStr },
        {
          $set: {
            userId: user._id,
            deviceId: deviceIdStr,
            platform: info.platform,
            deviceLabel: info.deviceLabel,
            appVersion: info.appVersion,
            premiumBindingStatus: 'none',
            lastAuthAt: new Date(),
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    if (isPremiumPlan(plan) && !user.premiumActivatedAt) {
      user.premiumActivatedAt = new Date();
      await user.save();
    }

    await AuthSession.updateMany(
      {
        userId: user._id,
        deviceId: deviceIdStr,
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } }
    );

    const jti = randomTokenHex(16);
    const token = generateToken(user._id, { jti, deviceId: deviceIdStr });
    await AuthSession.create({
      userId: user._id,
      deviceId: deviceIdStr,
      accessJti: jti,
      expiresAt: accessSessionExpiresAt(),
    });

    const deviceRow = await UserDevice.findOne({
      userId: user._id,
      deviceId: deviceIdStr,
    });

    return res.status(200).json({
      code: 'LOGIN_SUCCESS',
      token,
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        subscriptionPlan: plan,
      },
      deviceBinding: {
        deviceId: deviceIdStr,
        premiumBindingStatus: deviceRow?.premiumBindingStatus || 'none',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      code: 'SERVER_ERROR',
    });
  }
};

const initiateDeviceTransfer = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND' });
    }

    const plan = subscriptionPlanOf(user);
    if (!isPremiumPlan(plan)) {
      return res.status(403).json({
        code: 'NOT_PREMIUM',
        message: 'Device transfer applies to premium accounts only',
      });
    }

    if (!req.deviceIdFromToken) {
      return res.status(403).json({
        code: 'NOT_BOUND_DEVICE',
        message: 'JWT must include deviceId from a device login',
      });
    }

    const active = await UserDevice.findOne({
      userId: user._id,
      premiumBindingStatus: 'active',
    });

    if (!active || active.deviceId !== req.deviceIdFromToken) {
      return res.status(403).json({
        code: 'NOT_BOUND_DEVICE',
        message: 'Must call initiate from the premium-bound device',
      });
    }

    const raw = randomTokenHex(24);
    active.pendingTransfer = {
      tokenHash: hashSecret(raw),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      initiatedAt: new Date(),
    };
    await active.save();

    return res.status(200).json({
      code: 'TRANSFER_TOKEN_ISSUED',
      transferToken: raw,
      expiresAt: active.pendingTransfer.expiresAt,
    });
  } catch (error) {
    console.error('initiateDeviceTransfer:', error);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
};

const completeDeviceTransfer = async (req, res) => {
  try {
    const { email, password, deviceId: newDeviceId, transferToken } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ code: 'INVALID_CREDENTIALS' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ code: 'INVALID_CREDENTIALS' });
    }

    const info = req.normalizedDeviceInfo;
    const newId = String(newDeviceId).trim();

    const active = await UserDevice.findOne({
      userId: user._id,
      premiumBindingStatus: 'active',
    }).select('+pendingTransfer.tokenHash');

    if (!active || !active.pendingTransfer) {
      return res.status(400).json({
        code: 'TRANSFER_NOT_INITIATED',
        message: 'Start transfer from the current device first (step initiate)',
      });
    }

    if (active.pendingTransfer.expiresAt < new Date()) {
      return res.status(400).json({
        code: 'TRANSFER_EXPIRED',
        message: 'Transfer token expired; start again from the old device',
      });
    }

    if (
      !active.pendingTransfer.tokenHash ||
      hashSecret(String(transferToken)) !== active.pendingTransfer.tokenHash
    ) {
      return res.status(400).json({
        code: 'INVALID_TRANSFER_TOKEN',
        message: 'Transfer token does not match',
      });
    }

    if (active.deviceId === newId) {
      return res.status(400).json({
        code: 'SAME_DEVICE',
        message: 'Choose a different deviceId than the current premium device',
      });
    }

    await AuthSession.updateMany(
      { userId: user._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    active.premiumBindingStatus = 'none';
    active.pendingTransfer = undefined;
    await active.save();

    await UserDevice.findOneAndUpdate(
      { userId: user._id, deviceId: newId },
      {
        $set: {
          userId: user._id,
          deviceId: newId,
          platform: info.platform,
          deviceLabel: info.deviceLabel,
          appVersion: info.appVersion,
          premiumBindingStatus: 'active',
          lastAuthAt: new Date(),
        },
        $unset: { pendingTransfer: '' },
      },
      { upsert: true, new: true, runValidators: true }
    );

    await AuthSession.updateMany(
      { userId: user._id, deviceId: newId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    const jti = randomTokenHex(16);
    const token = generateToken(user._id, { jti, deviceId: newId });
    await AuthSession.create({
      userId: user._id,
      deviceId: newId,
      accessJti: jti,
      expiresAt: accessSessionExpiresAt(),
    });

    const deviceRow = await UserDevice.findOne({
      userId: user._id,
      deviceId: newId,
    });

    return res.status(200).json({
      code: 'TRANSFER_COMPLETE',
      token,
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        subscriptionPlan: subscriptionPlanOf(user),
      },
      deviceBinding: {
        deviceId: newId,
        premiumBindingStatus: deviceRow?.premiumBindingStatus || 'active',
      },
    });
  } catch (error) {
    console.error('completeDeviceTransfer:', error);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
};

const logoutUser = async (req, res) => {
  try {
    if (req.jti) {
      await AuthSession.updateMany(
        {
          accessJti: req.jti,
          userId: req.user.id,
          revokedAt: { $exists: false },
        },
        { $set: { revokedAt: new Date() } }
      );
    }

    return res.status(200).json({
      code: 'LOGOUT_SUCCESS',
    });
  } catch (error) {
    console.error('logoutUser:', error);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND' });
    }

    const plan = subscriptionPlanOf(user);

    const activePremiumRow = await UserDevice.findOne({
      userId: user._id,
      premiumBindingStatus: 'active',
    }).select('deviceId pendingTransfer.expiresAt');

    let thisDeviceRow = null;
    if (req.deviceIdFromToken) {
      thisDeviceRow = await UserDevice.findOne({
        userId: user._id,
        deviceId: req.deviceIdFromToken,
      }).select(
        'deviceId platform appVersion deviceLabel premiumBindingStatus lastAuthAt'
      );
    }

    const transferPending =
      activePremiumRow?.pendingTransfer?.expiresAt &&
      activePremiumRow.pendingTransfer.expiresAt > new Date();

    return res.status(200).json({
      code: 'ME_OK',
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        subscriptionPlan: plan,
        premiumActivatedAt: user.premiumActivatedAt,
      },
      deviceBinding: {
        thisDevice: thisDeviceRow
          ? {
              deviceId: thisDeviceRow.deviceId,
              platform: thisDeviceRow.platform,
              appVersion: thisDeviceRow.appVersion,
              deviceLabel: thisDeviceRow.deviceLabel,
              premiumBindingStatus: thisDeviceRow.premiumBindingStatus,
              lastAuthAt: thisDeviceRow.lastAuthAt,
            }
          : null,
        premiumActiveDeviceId: activePremiumRow
          ? activePremiumRow.deviceId
          : null,
        transferPending: Boolean(transferPending),
        transferExpiresAt: transferPending
          ? activePremiumRow.pendingTransfer.expiresAt
          : null,
      },
    });
  } catch (error) {
    console.error('getMe:', error);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        code: 'EMAIL_REQUIRED',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    await sendResetEmail(user.email, resetToken);

    return res.status(200).json({
      code: 'RESET_EMAIL_SENT',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      code: 'SERVER_ERROR',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        code: 'PASSWORD_REQUIRED',
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({
      code: 'PASSWORD_RESET_SUCCESS',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      code: 'SERVER_ERROR',
    });
  }
};

module.exports = {
  registerUser,
  verifyEmail,
  resendVerificationCode,
  loginUser,
  initiateDeviceTransfer,
  completeDeviceTransfer,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
};