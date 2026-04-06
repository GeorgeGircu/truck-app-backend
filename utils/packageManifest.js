/**
 * Validare manifest .pkg (v1) — fără JSON Schema runtime (fără dependență nouă).
 * Aliniază-te la schemas/package-manifest.v1.schema.json.
 */

const SEMVER_CORE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SEMVER_LOOSE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const ISO8601_LOOSE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const COUNTRY = /^[A-Z]{2}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_FILENAME = /^[^/\\]{1,255}$/;

const MANIFEST_ENTRY = 'manifest.json';

function validateBlob(block, path) {
  const errors = [];
  if (!block || typeof block !== 'object') {
    return [`${path} must be an object`];
  }
  const { name, sha256, sizeBytes } = block;
  if (typeof name !== 'string' || !SAFE_FILENAME.test(name)) {
    errors.push(`${path}.name must be a root file name without path separators`);
  }
  if (name && (name.includes('..') || name.startsWith('/'))) {
    errors.push(`${path}.name must not contain path traversal`);
  }
  if (typeof sha256 !== 'string' || !SHA256.test(sha256)) {
    errors.push(`${path}.sha256 must be 64 lowercase hex chars`);
  }
  if (
    !Number.isInteger(sizeBytes) ||
    sizeBytes < 1
  ) {
    errors.push(`${path}.sizeBytes must be a positive integer`);
  }
  return errors;
}

/**
 * @param {unknown} raw — obiect deja JSON.parse
 * @returns {{ ok: true, manifest: object } | { ok: false, errors: string[] }}
 */
function validatePackageManifestV1(raw) {
  const errors = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['manifest must be a JSON object'] };
  }

  if (raw.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }

  if (typeof raw.countryCode !== 'string' || !COUNTRY.test(raw.countryCode)) {
    errors.push('countryCode must be ISO 3166-1 alpha-2 uppercase');
  }

  if (typeof raw.countryName !== 'string' || raw.countryName.length < 1) {
    errors.push('countryName must be a non-empty string');
  }

  if (typeof raw.version !== 'string' || !SEMVER_LOOSE.test(raw.version)) {
    errors.push('version must be semver (e.g. 1.0.0)');
  }

  if (
    typeof raw.minimumAppVersion !== 'string' ||
    !SEMVER_CORE.test(raw.minimumAppVersion)
  ) {
    errors.push(
      'minimumAppVersion must be semver MAJOR.MINOR.PATCH only (e.g. 1.0.0)'
    );
  }

  if (typeof raw.createdAt !== 'string' || !ISO8601_LOOSE.test(raw.createdAt)) {
    errors.push('createdAt must be ISO 8601 date-time string');
  }

  if (!raw.files || typeof raw.files !== 'object') {
    errors.push('files object is required');
  } else {
    errors.push(...validateBlob(raw.files.map, 'files.map'));
    errors.push(...validateBlob(raw.files.routing, 'files.routing'));
  }

  if (raw.bounds !== undefined && raw.bounds !== null) {
    const b = raw.bounds;
    const nums = ['west', 'south', 'east', 'north'];
    if (typeof b !== 'object') {
      errors.push('bounds must be an object');
    } else {
      for (const k of nums) {
        if (typeof b[k] !== 'number' || Number.isNaN(b[k])) {
          errors.push(`bounds.${k} must be a number`);
        }
      }
    }
  }

  if (raw.center !== undefined && raw.center !== null) {
    const c = raw.center;
    if (typeof c !== 'object') {
      errors.push('center must be an object');
    } else {
      if (typeof c.lat !== 'number' || typeof c.lon !== 'number') {
        errors.push('center.lat and center.lon must be numbers');
      }
      if (c.zoom !== undefined && typeof c.zoom !== 'number') {
        errors.push('center.zoom must be a number when present');
      }
    }
  }

  if (raw.metadata !== undefined && raw.metadata !== null) {
    if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata)) {
      errors.push('metadata must be an object with string values');
    } else {
      for (const [k, v] of Object.entries(raw.metadata)) {
        if (typeof v !== 'string') {
          errors.push(`metadata.${k} must be a string`);
        }
      }
    }
  }

  const allowedTop = new Set([
    'schemaVersion',
    'countryCode',
    'countryName',
    'version',
    'minimumAppVersion',
    'createdAt',
    'files',
    'bounds',
    'center',
    'metadata',
  ]);
  for (const k of Object.keys(raw)) {
    if (!allowedTop.has(k)) {
      errors.push(`unknown top-level key: ${k}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, manifest: raw };
}

/**
 * Compară două semver core (a, b) — -1 dacă a&lt;b, 0 egal, 1 dacă a&gt;b
 */
function compareSemverCore(a, b) {
  const pa = a.split('.').map((x) => parseInt(x, 10));
  const pb = b.split('.').map((x) => parseInt(x, 10));
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

/**
 * @param {string} appVersionCore — ex. 1.0.0 din app (fără +build)
 * @param {string} minimumAppVersion — din manifest
 */
function isAppVersionCompatible(appVersionCore, minimumAppVersion) {
  if (!SEMVER_CORE.test(appVersionCore) || !SEMVER_CORE.test(minimumAppVersion)) {
    return false;
  }
  return compareSemverCore(appVersionCore, minimumAppVersion) >= 0;
}

module.exports = {
  MANIFEST_ENTRY,
  validatePackageManifestV1,
  compareSemverCore,
  isAppVersionCompatible,
};
