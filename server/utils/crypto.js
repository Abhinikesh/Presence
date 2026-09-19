const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Derive a 32-byte key from JWT_SECRET or fallback
function getSecretKey() {
  const secret = process.env.JWT_SECRET || 'presence-secure-chat-fallback-secret-key-32';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt plain text using AES-256-GCM
 * @param {string} text
 * @returns {{ ciphertext: string, iv: string, tag: string }}
 */
function encrypt(text) {
  if (!text) return { ciphertext: '', iv: '', tag: '' };
  const key = getSecretKey();
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
 * @param {string} ciphertext
 * @param {string} ivHex
 * @param {string} tagHex
 * @returns {string}
 */
function decrypt(ciphertext, ivHex, tagHex) {
  if (!ciphertext || !ivHex || !tagHex) return ciphertext || '';
  try {
    const key = getSecretKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, fallback to raw/empty:', err.message);
    return ciphertext;
  }
}

module.exports = {
  encrypt,
  decrypt
};
