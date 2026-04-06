const User = require('../models/User');
const UserDevice = require('../models/UserDevice');
const NavigationSession = require('../models/NavigationSession');
const RewardLog = require('../models/RewardLog');
const {
  isPremiumPlan,
  randomTokenHex,
  evaluatePremiumLoginForNewDevice,
} = require('../utils/deviceSessionHelpers');
const { signNavigationToken } = require('../utils/navigationJwt');

function subscriptionPlanOf(user) {
  return user.subscriptionPlan || 'free';
}

function sessionSummary(doc) {
  if (!doc) return null;
  const exp = doc.expiresAt;
  const nti = doc.navigationTokenIssuedAt;
  return {
    jti: doc.jti,
    status: doc.status,
    countryCode: doc.countryCode,
    planType: doc.planType,
    grantSource: doc.grantSource,
    expiresAt: exp instanceof Date ? exp.toISOString() : exp ?? null,
    navigationTokenIssuedAt:
      nti instanceof Date ? nti.toISOString() : nti ?? null,
  };
}

/**
 * POST /navigation/request-access
 */
async function requestNavigationAccess(req, res) {
  try {
    const cc = req.navCountryCode;
    const deviceId = req.navDeviceId;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND' });
    }

    const plan = subscriptionPlanOf(user);

    if (isPremiumPlan(plan)) {
      const activePremiumDevice = await UserDevice.findOne({
        userId: user._id,
        premiumBindingStatus: 'active',
      });

      if (!activePremiumDevice) {
        return res.status(200).json({
          code: 'NAV_ACCESS_OK',
          decision: 'denied',
          reasonCode: 'PREMIUM_NOT_BOUND',
          message:
            'Premium requires an active device binding on this device (log in with deviceId).',
          countryCode: cc,
          planType: plan,
          session: null,
        });
      }

      if (activePremiumDevice.deviceId !== deviceId) {
        const gate = evaluatePremiumLoginForNewDevice({
          userSubscriptionPlan: plan,
          requestingDeviceId: deviceId,
          activePremiumDeviceRow: {
            deviceId: activePremiumDevice.deviceId,
            premiumBindingStatus: activePremiumDevice.premiumBindingStatus,
            pendingTransfer: activePremiumDevice.pendingTransfer,
          },
        });

        if (gate.code === 'TRANSFER_REQUIRED') {
          return res.status(403).json({
            code: 'NAV_ACCESS_DENIED',
            decision: 'denied',
            reasonCode: 'TRANSFER_REQUIRED',
            message: 'Complete device transfer from your premium device',
            countryCode: cc,
            planType: plan,
          });
        }

        return res.status(403).json({
          code: 'NAV_ACCESS_DENIED',
          decision: 'denied',
          reasonCode: 'DEVICE_ALREADY_BOUND',
          message: 'Premium is active on another device',
          countryCode: cc,
          planType: plan,
        });
      }

      const existing = await NavigationSession.findOne({
        userId: user._id,
        deviceId,
        countryCode: cc,
        status: { $in: ['pending_token', 'active'] },
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        code: 'NAV_ACCESS_OK',
        decision:
          existing?.status === 'pending_token'
            ? 'awaiting_navigation_token'
            : existing?.status === 'active'
              ? 'session_active'
              : 'premium_allowed',
        reasonCode: null,
        countryCode: cc,
        planType: plan,
        session: sessionSummary(existing),
      });
    }

    const existing = await NavigationSession.findOne({
      userId: user._id,
      deviceId,
      countryCode: cc,
      status: { $in: ['pending_token', 'active'] },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existing?.status === 'pending_token') {
      return res.status(200).json({
        code: 'NAV_ACCESS_OK',
        decision: 'awaiting_navigation_token',
        reasonCode: null,
        message: 'Reward accepted; call POST /navigation/start-session',
        countryCode: cc,
        planType: plan,
        session: sessionSummary(existing),
      });
    }

    if (existing?.status === 'active') {
      return res.status(200).json({
        code: 'NAV_ACCESS_OK',
        decision: 'session_active',
        reasonCode: null,
        message: 'Navigation session active; may re-issue JWT via start-session',
        countryCode: cc,
        planType: plan,
        session: sessionSummary(existing),
      });
    }

    return res.status(200).json({
      code: 'NAV_ACCESS_OK',
      decision: 'reward_required',
      reasonCode: null,
      message:
        'MVP: call POST /navigation/confirm-reward after client ad reward (proof placeholder)',
      countryCode: cc,
      planType: plan,
      session: null,
    });
  } catch (e) {
    console.error('requestNavigationAccess:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

const DEFAULT_REWARD_SECONDS = 3600;

/**
 * POST /navigation/confirm-reward
 * proof — placeholder MVP: orice obiect non-array (SDK va trimite date reale mai târziu).
 */
async function confirmNavigationReward(req, res) {
  try {
    const cc = req.navCountryCode;
    const deviceId = req.navDeviceId;
    const { proof, grantDurationSeconds } = req.body;

    if (proof == null || typeof proof !== 'object' || Array.isArray(proof)) {
      return res.status(400).json({
        code: 'PROOF_REQUIRED',
        message:
          'MVP: pass proof as a non-null object (e.g. { "client": "sdk-placeholder" }). Server does not verify ad completion.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND' });
    }

    const plan = subscriptionPlanOf(user);
    if (isPremiumPlan(plan)) {
      return res.status(400).json({
        code: 'REWARD_NOT_APPLICABLE',
        message: 'Premium users use premium_allowed flow; reward is for free plan',
      });
    }

    await NavigationSession.updateMany(
      {
        userId: user._id,
        deviceId,
        countryCode: cc,
        status: 'pending_token',
      },
      { $set: { status: 'revoked', endedAt: new Date() } }
    );

    const duration = Math.min(
      Math.max(
        60,
        Number(grantDurationSeconds) > 0
          ? Number(grantDurationSeconds)
          : DEFAULT_REWARD_SECONDS
      ),
      86400 * 7
    );

    const reward = await RewardLog.create({
      userId: user._id,
      deviceId,
      provider: proof.provider ? String(proof.provider).slice(0, 64) : 'placeholder',
      placement: proof.placement
        ? String(proof.placement).slice(0, 128)
        : 'mvp',
      rewardType: 'navigation_grant',
      grantDurationSeconds: duration,
    });

    const jti = randomTokenHex(16);
    const expiresAt = new Date(Date.now() + duration * 1000);

    const session = await NavigationSession.create({
      userId: user._id,
      deviceId,
      countryCode: cc,
      planType: 'free',
      grantSource: 'rewarded_ad',
      rewardLogId: reward._id,
      jti,
      status: 'pending_token',
      startedAt: new Date(),
      expiresAt,
    });

    await RewardLog.updateOne(
      { _id: reward._id },
      { $set: { navigationSessionId: session._id } }
    );

    return res.status(201).json({
      code: 'NAV_REWARD_CONFIRMED',
      message:
        'MVP_LIMIT: proof is not verified server-side; abuse possible without provider SDK validation',
      countryCode: cc,
      planType: plan,
      session: sessionSummary(session),
      rewardLogId: String(reward._id),
    });
  } catch (e) {
    console.error('confirmNavigationReward:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

async function startNavigationSessionToken(req, res) {
  try {
    const cc = req.navCountryCode;
    const deviceId = req.navDeviceId;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND' });
    }

    const plan = subscriptionPlanOf(user);

    let sess;
    let expSeconds;

    if (isPremiumPlan(plan)) {
      const row = await UserDevice.findOne({
        userId: user._id,
        deviceId,
        premiumBindingStatus: 'active',
      });
      if (!row) {
        return res.status(403).json({
          code: 'NAV_PREMIUM_DEVICE_DENIED',
          message: 'Premium navigation requires active device binding on this device',
        });
      }

      sess = await NavigationSession.findOne({
        userId: user._id,
        deviceId,
        countryCode: cc,
        status: { $in: ['pending_token', 'active'] },
        expiresAt: { $gt: new Date() },
        planType: 'premium',
      }).sort({ createdAt: -1 });

      if (!sess) {
        const jti = randomTokenHex(16);
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
        sess = await NavigationSession.create({
          userId: user._id,
          deviceId,
          countryCode: cc,
          planType: 'premium',
          grantSource: 'subscription',
          jti,
          status: 'active',
          navigationTokenIssuedAt: new Date(),
          startedAt: new Date(),
          expiresAt,
        });
      } else {
        sess.status = 'active';
        sess.navigationTokenIssuedAt = new Date();
        await sess.save();
      }
    } else {
      sess = await NavigationSession.findOne({
        userId: user._id,
        deviceId,
        countryCode: cc,
        status: 'pending_token',
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!sess) {
        return res.status(403).json({
          code: 'NAV_NO_PENDING_SESSION',
          message:
            'No pending navigation grant. Call request-access then confirm-reward (free) or use premium device (premium).',
        });
      }

      sess.status = 'active';
      sess.navigationTokenIssuedAt = new Date();
      await sess.save();
    }

    const msLeft = sess.expiresAt.getTime() - Date.now();
    if (msLeft < 2000) {
      return res.status(410).json({
        code: 'NAV_SESSION_EXPIRED',
        message: 'Session expired; start flow again',
      });
    }

    expSeconds = Math.floor(msLeft / 1000);

    let navigationToken;
    try {
      navigationToken = signNavigationToken({
        userId: user._id,
        deviceId,
        countryCode: cc,
        jti: sess.jti,
        expiresInSeconds: expSeconds,
      });
    } catch (err) {
      console.error('signNavigationToken:', err);
      return res.status(503).json({
        code: 'NAV_JWT_UNAVAILABLE',
        message: err.message,
      });
    }

    return res.status(200).json({
      code: 'NAV_SESSION_TOKEN_ISSUED',
      navigationToken,
      tokenType: 'navigation',
      algorithm: 'HS256',
      countryCode: cc,
      planType: plan,
      session: sessionSummary(sess),
      expiresInSeconds: expSeconds,
      message:
        'Use this JWT only for navigation/routing unlock APIs; not the same as access token.',
    });
  } catch (e) {
    console.error('startNavigationSessionToken:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

async function endNavigationSession(req, res) {
  try {
    const deviceId = req.navDeviceId;
    const cc = req.navCountryCode;
    const { navigationJti } = req.body || {};

    const q = {
      userId: req.user.id,
      deviceId,
      countryCode: cc,
      status: { $in: ['active', 'pending_token'] },
    };
    if (navigationJti) {
      q.jti = String(navigationJti).trim();
    }

    const r = await NavigationSession.updateMany(q, {
      $set: { status: 'ended', endedAt: new Date() },
    });

    return res.status(200).json({
      code: 'NAV_SESSION_ENDED',
      modifiedCount: r.modifiedCount,
      countryCode: cc,
    });
  } catch (e) {
    console.error('endNavigationSession:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

async function getNavigationSessionStatus(req, res) {
  try {
    if (!req.deviceIdFromToken) {
      return res.status(400).json({
        code: 'DEVICE_JWT_REQUIRED',
        message: 'Access token must include deviceId',
      });
    }
    const deviceId = req.deviceIdFromToken;

    const ccRaw = req.query.countryCode;
    const q = {
      userId: req.user.id,
      deviceId,
      expiresAt: { $gt: new Date() },
      status: { $in: ['pending_token', 'active'] },
    };
    if (ccRaw) {
      const cc = String(ccRaw).toUpperCase().trim();
      if (!/^[A-Z]{2}$/.test(cc)) {
        return res.status(400).json({ code: 'INVALID_COUNTRY' });
      }
      q.countryCode = cc;
    }

    const sessions = await NavigationSession.find(q)
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const user = await User.findById(req.user.id).select('subscriptionPlan');
    const plan = subscriptionPlanOf(user);

    return res.status(200).json({
      code: 'NAV_STATUS_OK',
      planType: plan,
      deviceId,
      sessions: sessions.map((s) => sessionSummary(s)),
    });
  } catch (e) {
    console.error('getNavigationSessionStatus:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

module.exports = {
  requestNavigationAccess,
  confirmNavigationReward,
  startNavigationSessionToken,
  endNavigationSession,
  getNavigationSessionStatus,
};
