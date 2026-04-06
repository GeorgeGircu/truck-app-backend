const jwt = require('jsonwebtoken');
const AuthSession = require('../models/AuthSession');

/**
 * Validează Bearer JWT și atașează req.user.id, req.jti, req.deviceIdFromToken.
 */
function authenticate(req, res, next) {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id || decoded._id || decoded.sub;
    if (!id) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Invalid token payload',
      });
    }
    req.user = { id: String(id) };
    req.jti = decoded.jti;
    req.deviceIdFromToken = decoded.deviceId;
    return next();
  } catch (err) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    });
  }
}

/**
 * Dacă tokenul are `jti`, sesiunea trebuie să existe și să nu fie revocată.
 * Tokenuri legacy fără `jti` trec mai departe (revocare server-side imposibilă).
 */
async function requireActiveAccessSession(req, res, next) {
  if (!req.jti) {
    return next();
  }

  try {
    const sess = await AuthSession.findOne({
      accessJti: req.jti,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!sess) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Session revoked or expired',
      });
    }

    req.authSession = sess;
    return next();
  } catch (e) {
    console.error('requireActiveAccessSession:', e);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
}

module.exports = {
  authenticate,
  requireActiveAccessSession,
};
