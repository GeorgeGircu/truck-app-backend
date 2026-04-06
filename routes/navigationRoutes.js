const express = require('express');
const router = express.Router();

const {
  authenticate,
  requireActiveAccessSession,
} = require('../middleware/authMiddleware');
const {
  validateDeviceAndCountry,
  matchJwtDevice,
} = require('../middleware/navigationAccessBody');
const { authenticateNavigationUnlock } = require('../middleware/navigationUnlockAuth');
const {
  startNavigationSession,
  unlockRouting,
} = require('../controllers/navigationController');
const {
  requestNavigationAccess,
  confirmNavigationReward,
  startNavigationSessionToken,
  endNavigationSession,
  getNavigationSessionStatus,
} = require('../controllers/navigationAccessController');

const bodyDeviceChain = [
  authenticate,
  requireActiveAccessSession,
  validateDeviceAndCountry,
  matchJwtDevice,
];

/** Flux control acces navigație (token nav separat de auth). */
router.post('/request-access', ...bodyDeviceChain, requestNavigationAccess);
router.post('/confirm-reward', ...bodyDeviceChain, confirmNavigationReward);
router.post('/start-session', ...bodyDeviceChain, startNavigationSessionToken);
router.post('/end-session', ...bodyDeviceChain, endNavigationSession);

router.get(
  '/session-status',
  authenticate,
  requireActiveAccessSession,
  getNavigationSessionStatus
);

/** @deprecated Prefer request-access + start-session; reținut pentru compat. */
router.post(
  '/start',
  authenticate,
  requireActiveAccessSession,
  startNavigationSession
);

router.post(
  '/unlock',
  authenticateNavigationUnlock,
  validateDeviceAndCountry,
  matchJwtDevice,
  unlockRouting
);

module.exports = router;
