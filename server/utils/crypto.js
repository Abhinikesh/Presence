const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Derive a 32-byte key from MESSAGE_ENCRYPTION_KEY or JWT_SECRET
// If pairId is provided, derives a per-pair isolated key via HMAC-SHA256
function getSecretKey(pairId = null) {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY || process.env.JWT_SECRET || 'presence-secure-chat-fallback-secret-key-32';
  const rootKey = crypto.createHash('sha256').update(String(secret)).digest();
  if (pairId) {
    return crypto.createHmac('sha256', rootKey).update('presence-pair-key:' + String(pairId)).digest();
  }
  return rootKey;
}

/**
 * Encrypt plain text using AES-256-GCM
 * @param {string} text
 * @param {string} [pairId] - Optional pair identifier for isolated per-pair encryption
 * @returns {{ ciphertext: string, iv: string, tag: string }}
 */
function encrypt(text, pairId = null) {
  if (!text) return { ciphertext: '', iv: '', tag: '' };
  const key = getSecretKey(pairId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag
  };
}

/**
 * Decrypt cipher text using AES-256-GCM
 * Tries per-pair derived key first, then falls back to legacy global key
 * @param {string} ciphertext
 * @param {string} ivHex
 * @param {string} tagHex
 * @param {string} [pairId] - Optional pair identifier
 * @returns {string}
 */
function decrypt(ciphertext, ivHex, tagHex, pairId = null) {
  if (!ciphertext || !ivHex || !tagHex) return ciphertext || '';

  // Helper to attempt decryption with a given key
  const attemptDecrypt = (key) => {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  };

  // 1. Try with per-pair key if pairId is provided
  if (pairId) {
    try {
      return attemptDecrypt(getSecretKey(pairId));
    } catch (_) {
      // Fall through to legacy global key
    }
  }

  // 2. Try with legacy global key
  try {
    return attemptDecrypt(getSecretKey(null));
  } catch (err) {
    console.error('Decryption failed for message, fallback to ciphertext:', err.message);
    return ciphertext;
  }
}

module.exports = {
  encrypt,
  decrypt,
  getSecretKey
};
