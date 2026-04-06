const DEVICE_ID_REGEX = /^[a-zA-Z0-9._@-]+$/;
const MIN_LEN = 8;
const MAX_LEN = 128;

function isValidDeviceId(deviceId) {
  if (typeof deviceId !== 'string') return false;
  const s = deviceId.trim();
  if (s.length < MIN_LEN || s.length > MAX_LEN) return false;
  return DEVICE_ID_REGEX.test(s);
}

/**
 * Normalizează obiectul deviceInfo trimis de client (Flutter).
 * @param {unknown} deviceInfo
 */
function normalizeDeviceInfo(deviceInfo) {
  if (deviceInfo == null) {
    return {
      platform: 'unknown',
      deviceLabel: undefined,
      appVersion: undefined,
    };
  }

  if (typeof deviceInfo !== 'object' || Array.isArray(deviceInfo)) {
    return null;
  }

  const allowed = ['ios', 'android', 'web', 'unknown'];
  const rawPlatform = String(deviceInfo.platform || '').toLowerCase();
  const platform = allowed.includes(rawPlatform) ? rawPlatform : 'unknown';

  const labelRaw =
    deviceInfo.model ??
    deviceInfo.deviceLabel ??
    deviceInfo.friendlyName ??
    '';
  const deviceLabel = String(labelRaw).trim().slice(0, 200) || undefined;

  const appVersionRaw = deviceInfo.appVersion ?? deviceInfo.app_version;
  const appVersion = appVersionRaw
    ? String(appVersionRaw).trim().slice(0, 64) || undefined
    : undefined;

  return { platform, deviceLabel, appVersion };
}

/**
 * Middleware: validează deviceId / deviceInfo pentru login (dacă sunt trimise).
 */
function validateOptionalLoginDevice(req, res, next) {
  const { deviceId, deviceInfo } = req.body;

  if (deviceId !== undefined && deviceId !== null && deviceId !== '') {
    if (!isValidDeviceId(String(deviceId))) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid deviceId',
        fields: { deviceId: 'Must be 8–128 chars: letters, digits, ._-@' },
      });
    }
  }

  if (deviceInfo !== undefined && deviceInfo !== null) {
    const normalized = normalizeDeviceInfo(deviceInfo);
    if (normalized === null) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid deviceInfo',
        fields: { deviceInfo: 'Must be an object with optional platform, model, appVersion' },
      });
    }
    req.normalizedDeviceInfo = normalized;
  } else {
    req.normalizedDeviceInfo = normalizeDeviceInfo(null);
  }

  next();
}

/**
 * Validează body pentru transfer step `complete`.
 */
function validateTransferCompleteBody(req, res, next) {
  const { email, password, deviceId, transferToken, deviceInfo } = req.body;

  if (!email || !password || !deviceId || !transferToken) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'email, password, deviceId and transferToken are required',
      fields: {
        email: email ? undefined : 'required',
        password: password ? undefined : 'required',
        deviceId: deviceId ? undefined : 'required',
        transferToken: transferToken ? undefined : 'required',
      },
    });
  }

  if (!isValidDeviceId(String(deviceId))) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      fields: { deviceId: 'Invalid deviceId' },
    });
  }

  if (typeof transferToken !== 'string' || transferToken.length < 16) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      fields: { transferToken: 'Invalid transfer token' },
    });
  }

  const n = normalizeDeviceInfo(deviceInfo);
  if (n === null) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      fields: { deviceInfo: 'Invalid shape' },
    });
  }
  req.normalizedDeviceInfo = n;
  next();
}

module.exports = {
  isValidDeviceId,
  normalizeDeviceInfo,
  validateOptionalLoginDevice,
  validateTransferCompleteBody,
};
