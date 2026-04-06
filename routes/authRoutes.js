const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/authController');

const {
  validateOptionalLoginDevice,
  validateTransferCompleteBody,
} = require('../middleware/validateLoginDevice');

const {
  authenticate,
  requireActiveAccessSession,
} = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendVerificationCode);
router.post('/login', validateOptionalLoginDevice, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.post('/logout', authenticate, requireActiveAccessSession, logoutUser);
router.get('/me', authenticate, requireActiveAccessSession, getMe);

router.post(
  '/device/transfer',
  (req, res, next) => {
    if (req.body && req.body.step === 'complete') {
      return validateTransferCompleteBody(req, res, () =>
        completeDeviceTransfer(req, res)
      );
    }
    if (!req.body || req.body.step !== 'initiate') {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'body.step must be "initiate" or "complete"',
      });
    }
    return next();
  },
  authenticate,
  requireActiveAccessSession,
  initiateDeviceTransfer
);

module.exports = router;
