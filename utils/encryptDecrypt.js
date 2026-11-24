const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended size for GCM
const AUTH_TAG_LENGTH = 16;
const VERSION = 'v2';

function getEncryptionKey() {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required.');
  }

  /*
   * ENCRYPTION_KEY must be a Base64-encoded 32-byte random key.
   */
  const key = Buffer.from(encryptionKey, 'base64');

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a Base64-encoded 32-byte key.');
  }

  return key;
}

function encryptMFASecretCode(text) {
  if (typeof text !== 'string' || !text) {
    throw new TypeError('MFA secret code is required.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  /*
   * Stored format:
   * version:iv:authTag:ciphertext
   */
  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

function decryptMFASecretCode(value) {
  if (!value) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new TypeError('Encrypted MFA secret must be a string.');
  }

  const parts = value.split(':');

  if (parts.length !== 4) {
    throw new Error('Invalid encrypted MFA secret format.');
  }

  const [version, ivBase64, authTagBase64, encryptedBase64] = parts;

  if (version !== VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid encryption IV.');
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid authentication tag.');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    throw new Error(
      'Unable to decrypt MFA secret. The data may be corrupted or tampered with.',
    );
  }
}

function encryptText(text) {
  return encryptMFASecretCode(text);
}

function decryptText(value) {
  return decryptMFASecretCode(value);
}

module.exports = {
  encryptMFASecretCode,
  decryptMFASecretCode,
  encryptText,
  decryptText,
};
