const crypto = require('crypto');

const PLAN_ORDER = { free: 0, basic: 1, premium: 2 };

/**
 * Hash pentru tokenuri sau coduri de transfer (nu pentru parole user).
 * @param {string} rawToken
 * @returns {string} hex sha256
 */
function hashSecret(rawToken) {
  if (typeof rawToken !== 'string' || rawToken.length < 8) {
    throw new Error('hashSecret: rawToken must be a non-trivial string');
  }
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

/**
 * Generează valori aleatoare sigure pentru jti sau nonce-uri.
 * @param {number} byteLength default 16 → 32 hex chars
 */
function randomTokenHex(byteLength = 16) {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * @param {string} plan
 * @returns {boolean}
 */
function isPremiumPlan(plan) {
  return plan === 'premium';
}

/**
 * Compară planuri (pentru verificări viitoare în controller).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function comparePlan(a, b) {
  return (PLAN_ORDER[a] ?? -1) - (PLAN_ORDER[b] ?? -1);
}

/**
 * Rezultat pentru login/device check (endpointurile vor mapa la coduri HTTP).
 * @typedef {'OK' | 'DEVICE_ALREADY_BOUND' | 'TRANSFER_REQUIRED'} DeviceGateResult
 */

/**
 * Logica dorită: premium = un singur device cu premiumBindingStatus 'active'.
 * Dacă alt device se autentifică și userul e premium, nu permite fără transfer.
 *
 * @param {object} params
 * @param {'free'|'basic'|'premium'} params.userSubscriptionPlan
 * @param {string} params.requestingDeviceId
 * @param {{ deviceId: string, premiumBindingStatus: string } | null} params.activePremiumDeviceRow document UserDevice sau null
 * @returns {DeviceGateResult}
 */
function evaluatePremiumDeviceGate({
  userSubscriptionPlan,
  requestingDeviceId,
  activePremiumDeviceRow,
}) {
  if (!isPremiumPlan(userSubscriptionPlan)) {
    return 'OK';
  }

  if (!activePremiumDeviceRow) {
    return 'OK';
  }

  if (activePremiumDeviceRow.premiumBindingStatus !== 'active') {
    return 'OK';
  }

  if (activePremiumDeviceRow.deviceId === requestingDeviceId) {
    return 'OK';
  }

  return 'DEVICE_ALREADY_BOUND';
}

/**
 * Verifică dacă există transfer pending valid pe rândul device-ului sursă.
 * @param {import('mongoose').Document & { pendingTransfer?: { expiresAt: Date } }} deviceDoc
 * @param {Date} [now]
 * @returns {boolean}
 */
function hasValidPendingTransfer(deviceDoc, now = new Date()) {
  const pt = deviceDoc?.pendingTransfer;
  if (!pt || !pt.expiresAt) return false;
  return pt.expiresAt > now;
}

/**
 * Pentru login de pe un device nou: distinge blocajul dur de fluxul de transfer.
 * - TRANSFER_REQUIRED — există transfer inițiat de pe device-ul premium (cod încă valabil).
 * - DEVICE_ALREADY_BOUND — premium activ pe alt device, fără transfer în așteptare valid.
 *
 * @param {object} params
 * @param {'free'|'basic'|'premium'} params.userSubscriptionPlan
 * @param {string} params.requestingDeviceId
 * @param {{ deviceId: string, premiumBindingStatus: string, pendingTransfer?: { expiresAt: Date } } | null} params.activePremiumDeviceRow
 * @returns {{ code: 'OK' | 'DEVICE_ALREADY_BOUND' | 'TRANSFER_REQUIRED' }}
 */
function evaluatePremiumLoginForNewDevice({
  userSubscriptionPlan,
  requestingDeviceId,
  activePremiumDeviceRow,
}) {
  const gate = evaluatePremiumDeviceGate({
    userSubscriptionPlan,
    requestingDeviceId,
    activePremiumDeviceRow,
  });
  if (gate === 'OK') {
    return { code: 'OK' };
  }
  if (hasValidPendingTransfer(activePremiumDeviceRow)) {
    return { code: 'TRANSFER_REQUIRED' };
  }
  return { code: 'DEVICE_ALREADY_BOUND' };
}

module.exports = {
  hashSecret,
  randomTokenHex,
  isPremiumPlan,
  comparePlan,
  evaluatePremiumDeviceGate,
  hasValidPendingTransfer,
  evaluatePremiumLoginForNewDevice,
  PLAN_ORDER,
};
