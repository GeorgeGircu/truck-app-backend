/**
 * Validează body comun navigare: deviceId, countryCode (ISO2).
 */
function validateDeviceAndCountry(req, res, next) {
  const { deviceId, countryCode } = req.body || {};

  if (!deviceId || !countryCode) {
    return res.status(400).json({
      code: 'MISSING_FIELDS',
      message: 'deviceId and countryCode are required',
      fields: {
        deviceId: deviceId ? undefined : 'required',
        countryCode: countryCode ? undefined : 'required',
      },
    });
  }

  if (String(deviceId).trim().length < 8) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid deviceId',
    });
  }

  const cc = String(countryCode).toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(cc)) {
    return res.status(400).json({
      code: 'INVALID_COUNTRY',
      message: 'countryCode must be ISO 3166-1 alpha-2',
    });
  }

  req.navCountryCode = cc;
  req.navDeviceId = String(deviceId).trim();
  return next();
}

function matchJwtDevice(req, res, next) {
  if (!req.deviceIdFromToken) {
    return res.status(400).json({
      code: 'DEVICE_JWT_REQUIRED',
      message:
        'JWT must include deviceId (same device as login / navigation token).',
    });
  }
  if (req.navDeviceId !== req.deviceIdFromToken) {
    return res.status(403).json({
      code: 'DEVICE_MISMATCH',
      message: 'body.deviceId must match JWT deviceId',
    });
  }
  return next();
}

module.exports = {
  validateDeviceAndCountry,
  matchJwtDevice,
};
