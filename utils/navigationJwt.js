const jwt = require('jsonwebtoken');

/**
 * JWT de navigație — separat de access token (auth).
 * Secret: NAV_JWT_SECRET (recomandat); fallback JWT_SECRET pentru dev.
 */
function navigationSecret() {
  return process.env.NAV_JWT_SECRET || process.env.JWT_SECRET;
}

/**
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.deviceId
 * @param {string} p.countryCode ISO2 uppercase
 * @param {string} p.jti — aliniat la NavigationSession.jti
 * @param {number} p.expiresInSeconds
 */
function signNavigationToken(p) {
  const secret = navigationSecret();
  if (!secret) {
    throw new Error('NAV_JWT_SECRET or JWT_SECRET must be set');
  }

  const payload = {
    sub: String(p.userId),
    deviceId: String(p.deviceId),
    countryCode: String(p.countryCode).toUpperCase(),
    jti: String(p.jti),
    typ: 'navigation',
  };

  const ttl = Math.min(
    Math.max(60, Number(p.expiresInSeconds) || 3600),
    7 * 24 * 60 * 60
  );

  return jwt.sign(payload, secret, {
    expiresIn: ttl,
    algorithm: 'HS256',
  });
}

function verifyNavigationToken(token) {
  const secret = navigationSecret();
  if (!secret) throw new Error('JWT secret not configured');
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

module.exports = {
  signNavigationToken,
  verifyNavigationToken,
  navigationSecret,
};
