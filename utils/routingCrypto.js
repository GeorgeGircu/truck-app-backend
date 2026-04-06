const crypto = require('crypto');

const MAGIC = Buffer.from('IRN1', 'ascii');
const FORMAT_VERSION = 1;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Master key: env ROUTING_MASTER_KEY_HEX = 64 hex chars (32 bytes).
 * Același secret trebuie folosit la build (encrypt-routing.mjs) și pe server la unlock.
 */
function loadRoutingMasterKey() {
  const hex = process.env.ROUTING_MASTER_KEY_HEX;
  if (!hex || typeof hex !== 'string') {
    throw new Error('ROUTING_MASTER_KEY_HEX is not set');
  }
  const buf = Buffer.from(hex.trim(), 'hex');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `ROUTING_MASTER_KEY_HEX must be ${KEY_LENGTH * 2} hex chars (${KEY_LENGTH} bytes)`
    );
  }
  return buf;
}

/**
 * Cheie AES-256 pentru blobul routing.enc al unui pachet (țară + versiune conținut).
 * HKDF-SHA256 (RFC 5869) — standard, fără criptografie inventată aici.
 */
function deriveRoutingPackageKey(countryCode, packageVersion) {
  const master = loadRoutingMasterKey();
  const salt = Buffer.from(
    `${String(countryCode).toUpperCase()}|${String(packageVersion).trim()}`,
    'utf8'
  );
  const info = Buffer.from('ironpilox-routing-pkg-v1', 'utf8');
  // Node poate întoarce ArrayBuffer; Buffer.from normalizează pentru AES / keyB64
  const raw = crypto.hkdfSync('sha256', master, salt, info, KEY_LENGTH);
  return Buffer.from(raw);
}

/**
 * Criptează buffer rutare (ex. SQLite) → format binar routing.enc
 * Structură: MAGIC(4) | version(1) | nonce(12) | ciphertext | tag(16)
 */
function encryptRoutingPayload(plainBuffer, countryCode, packageVersion) {
  const key = deriveRoutingPackageKey(countryCode, packageVersion);
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce, {
    authTagLength: TAG_LENGTH,
  });
  const ciphertext = Buffer.concat([
    cipher.update(plainBuffer),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, Buffer.from([FORMAT_VERSION]), nonce, ciphertext, tag]);
}

/**
 * Verifică integritatea (GCM) și returnează plaintextul.
 */
function decryptRoutingPayload(blobBuffer, countryCode, packageVersion) {
  if (blobBuffer.length < MAGIC.length + 1 + NONCE_LENGTH + TAG_LENGTH) {
    throw new Error('routing blob too short');
  }
  if (!blobBuffer.subarray(0, 4).equals(MAGIC)) {
    throw new Error('invalid routing magic');
  }
  if (blobBuffer[4] !== FORMAT_VERSION) {
    throw new Error(`unsupported routing format version: ${blobBuffer[4]}`);
  }
  const nonce = blobBuffer.subarray(5, 5 + NONCE_LENGTH);
  const tag = blobBuffer.subarray(blobBuffer.length - TAG_LENGTH);
  const ciphertext = blobBuffer.subarray(5 + NONCE_LENGTH, blobBuffer.length - TAG_LENGTH);
  const key = deriveRoutingPackageKey(countryCode, packageVersion);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

module.exports = {
  MAGIC: MAGIC.toString('utf8'),
  FORMAT_VERSION,
  NONCE_LENGTH,
  TAG_LENGTH,
  deriveRoutingPackageKey,
  encryptRoutingPayload,
  decryptRoutingPayload,
};
