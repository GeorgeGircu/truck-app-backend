const { verifyNavigationToken } = require('../utils/navigationJwt');

/**
 * Acceptă **doar** Bearer navigation JWT (emis la `POST /navigation/start-session`).
 * Setează [req.user.id], [req.deviceIdFromToken], [req.navigationCountryCode].
 */
function authenticateNavigationUnlock(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Empty token',
    });
  }

  try {
    const decoded = verifyNavigationToken(token);
    if (decoded.typ !== 'navigation') {
      return res.status(401).json({
        code: 'INVALID_TOKEN_TYPE',
        message: 'Navigation JWT required for routing unlock',
      });
    }

    const uid = decoded.sub;
    if (!uid) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Invalid navigation token payload',
      });
    }

    const deviceId = decoded.deviceId;
    if (!deviceId) {
      return res.status(401).json({
        code: 'DEVICE_JWT_REQUIRED',
        message:
          'Navigation token must include deviceId (login + start-session flow)',
      });
    }

    req.user = { id: String(uid) };
    req.deviceIdFromToken = String(deviceId);
    req.navigationCountryCode = String(decoded.countryCode || '')
      .toUpperCase()
      .trim();

    return next();
  } catch (err) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message:
        err.name === 'TokenExpiredError'
          ? 'Navigation token expired'
          : 'Invalid navigation token',
    });
  }
}

module.exports = {
  authenticateNavigationUnlock,
};
