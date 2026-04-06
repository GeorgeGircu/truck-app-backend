const User = require('../models/User');
const UserDevice = require('../models/UserDevice');
const NavigationSession = require('../models/NavigationSession');
const {
  isPremiumPlan,
  randomTokenHex,
} = require('../utils/deviceSessionHelpers');
const { deriveRoutingPackageKey } = require('../utils/routingCrypto');

function subscriptionPlanOf(user) {
  return user.subscriptionPlan || 'free';
}

function requireDeviceJwt(req, res) {
  if (!req.deviceIdFromToken) {
    res.status(400).json({
      code: 'DEVICE_JWT_REQUIRED',
      message:
        'Login with deviceId is required for navigation. Legacy tokens cannot unlock routing.',
    });
    return false;
  }
  return true;
}

/**
 * Pornește sesiune navigație (grant pentru free/basic sau audit; premium poate folosi direct unlock).
 */
async function startNavigationSession(req, res) {
  try {
    if (!requireDeviceJwt(req, res)) return;

    const { deviceId, countryCode } = req.body;
    if (!deviceId || !countryCode) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'deviceId and countryCode are required',
      });
    }

    if (deviceId !== req.deviceIdFromToken) {
      return res.status(403).json({
        code: 'DEVICE_MISMATCH',
        message: 'deviceId must match JWT deviceId',
      });
    }

    const cc = String(countryCode).toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(cc)) {
      return res.status(400).json({ code: 'INVALID_COUNTRY' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND' });
    }

    const plan = subscriptionPlanOf(user);
    const grantSource = isPremiumPlan(plan) ? 'subscription' : 'trial';

    const jti = randomTokenHex(16);
    const ttlMs = isPremiumPlan(plan) ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;

    await NavigationSession.create({
      userId: user._id,
      deviceId,
      countryCode: cc,
      planType: plan === 'basic' ? 'basic' : plan === 'premium' ? 'premium' : 'free',
      grantSource,
      jti,
      status: 'active',
      navigationTokenIssuedAt: new Date(),
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
    });

    return res.status(200).json({
      code: 'NAV_SESSION_STARTED',
      countryCode: cc,
      planType: plan,
      navigationJti: jti,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    });
  } catch (e) {
    console.error('startNavigationSession:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

/**
 * Returnează materialul de decriptare AES-256 (cheia pachetului) după validare entitlement.
 * Cheia este aceeași pentru toți utilizatorii unui același (countryCode, packageVersion),
 * dar o obții doar după autentificare + sesiune/device valide.
 */
async function unlockRouting(req, res) {
  try {
    if (!requireDeviceJwt(req, res)) return;

    const { deviceId, countryCode, packageVersion } = req.body;

    if (!deviceId || !countryCode || !packageVersion) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'deviceId, countryCode, packageVersion are required',
      });
    }

    if (deviceId !== req.deviceIdFromToken) {
      return res.status(403).json({
        code: 'DEVICE_MISMATCH',
        message: 'deviceId must match JWT deviceId',
      });
    }

    const cc = String(countryCode).toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(cc)) {
      return res.status(400).json({ code: 'INVALID_COUNTRY' });
    }

    if (
      req.navigationCountryCode &&
      /^[A-Z]{2}$/.test(req.navigationCountryCode) &&
      req.navigationCountryCode !== cc
    ) {
      return res.status(403).json({
        code: 'NAV_TOKEN_COUNTRY_MISMATCH',
        message: 'Navigation token is not valid for this country',
      });
    }

    const pkgVer = String(packageVersion).trim();
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(pkgVer)) {
      return res.status(400).json({
        code: 'INVALID_PACKAGE_VERSION',
        message: 'packageVersion must be semver MAJOR.MINOR.PATCH',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND' });
    }

    const plan = subscriptionPlanOf(user);
    let entitled = false;

    if (isPremiumPlan(plan)) {
      const row = await UserDevice.findOne({
        userId: user._id,
        deviceId,
        premiumBindingStatus: 'active',
      });
      entitled = Boolean(row);
    } else {
      const sess = await NavigationSession.findOne({
        userId: user._id,
        deviceId,
        countryCode: cc,
        status: 'active',
        expiresAt: { $gt: new Date() },
      });
      if (!sess) {
        entitled = false;
      } else if (
        sess.grantSource === 'rewarded_ad' &&
        !sess.navigationTokenIssuedAt
      ) {
        entitled = false;
      } else {
        entitled = true;
      }
    }

    if (!entitled) {
      return res.status(403).json({
        code: 'NAV_ENTITLEMENT_DENIED',
        message:
          'Premium device binding or active navigation session required for this country',
      });
    }

    let key;
    try {
      key = deriveRoutingPackageKey(cc, pkgVer);
    } catch (e) {
      console.error('routing key derivation:', e.message);
      return res.status(503).json({
        code: 'ROUTING_KEY_UNAVAILABLE',
        message: 'Server routing key not configured',
      });
    }

    return res.status(200).json({
      code: 'ROUTING_UNLOCK_OK',
      algorithm: 'AES-256-GCM',
      encodingFormat: 'ironpilox-routing-v1',
      countryCode: cc,
      packageVersion: pkgVer,
      planType: plan,
      /** Material simetric 32 bytes — doar TLS; păstrat în memorie pe client, nu logați. */
      keyB64: key.toString('base64'),
      integrity: 'GCM authenticates ciphertext; package manifest lists sha256 of routing.enc',
    });
  } catch (e) {
    console.error('unlockRouting:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

module.exports = {
  startNavigationSession,
  unlockRouting,
};
