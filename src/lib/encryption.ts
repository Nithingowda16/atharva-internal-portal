import crypto from 'crypto';

// Secret key derivation using AES-256-GCM
const SECRET = process.env.JWT_SECRET || 'atharva_travels_fleet_master_encryption_secret_2026';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

/**
 * Encrypt sensitive plain text using AES-256-GCM
 */
export function encryptSensitiveField(plaintext: string | null | undefined): string | null {
  if (!plaintext || typeof plaintext !== 'string') return null;
  const clean = plaintext.trim();
  if (!clean) return null;

  try {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    let encrypted = cipher.update(clean, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Failed to encrypt sensitive field:', err);
    throw new Error('Encryption error');
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export function decryptSensitiveField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext || typeof ciphertext !== 'string') return null;
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // Return null if not properly formatted
    return null;
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt sensitive field');
    return null;
  }
}

/**
 * Validates Indian PAN format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)
 */
export function validatePAN(pan: string | null | undefined): { valid: boolean; formatted: string; message?: string } {
  if (!pan) return { valid: false, formatted: '', message: 'PAN is required' };
  const clean = pan.toUpperCase().replace(/\s+/g, '').trim();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(clean)) {
    return {
      valid: false,
      formatted: clean,
      message: 'Invalid PAN format. Must be 5 uppercase letters, 4 digits, and 1 letter (e.g., ABCDE1234F)',
    };
  }
  return { valid: true, formatted: clean };
}

/**
 * Validates Indian Driving Licence format: typically 12 to 16 alphanumeric characters
 * Example: KA0120190012345 or KA-04-2018-0001234
 */
export function validateDrivingLicence(dl: string | null | undefined): { valid: boolean; formatted: string; message?: string } {
  if (!dl) return { valid: false, formatted: '', message: 'Driving licence number is required' };
  const clean = dl.toUpperCase().replace(/[\s-]+/g, '').trim();
  // Standard format check: 2 letter state code followed by 10 to 14 digits/alphanumerics
  const dlRegex = /^[A-Z]{2}[0-9A-Z]{8,14}$/;
  if (!dlRegex.test(clean) || clean.length < 10 || clean.length > 16) {
    return {
      valid: false,
      formatted: clean,
      message: 'Invalid Driving Licence format. Must be 10-16 alphanumeric characters (e.g., KA0120190012345)',
    };
  }
  return { valid: true, formatted: clean };
}

/**
 * Masks PAN Number: shows first 5 characters and last 1 character, hides middle 4 digits (e.g., ABCDE****F)
 */
export function maskPAN(pan: string | null | undefined): string {
  if (!pan) return '••••••••••';
  const clean = pan.toUpperCase().replace(/\s+/g, '');
  if (clean.length < 10) return '••••••••••';
  return `${clean.slice(0, 5)}****${clean.slice(9, 10)}`;
}

/**
 * Masks Driving Licence: shows state code and last 4 characters, hides middle digits (e.g., KA••••••••1234)
 */
export function maskDL(dl: string | null | undefined): string {
  if (!dl) return '•••••••••••••';
  const clean = dl.toUpperCase().replace(/[\s-]+/g, '');
  if (clean.length < 6) return '•••••••••••••';
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-4);
  const maskLength = Math.max(4, clean.length - 6);
  return `${prefix}${'•'.repeat(maskLength)}${suffix}`;
}

/**
 * Validates Indian Vehicle Registration Number format (e.g. KA01AB1234 or KA01A1234 or KA-01-AB-1234)
 */
export function validateRegistrationNumber(reg: string | null | undefined): { valid: boolean; formatted: string; message?: string } {
  if (!reg) return { valid: false, formatted: '', message: 'Registration number is required' };
  const clean = reg.toUpperCase().replace(/[\s-]+/g, '').trim();
  // Allow special legacy preserved records like KAUNSPECIFIEDSEC46
  if (clean.startsWith('KAUNSPECIFIED')) {
    return { valid: true, formatted: clean };
  }
  const regRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
  if (!regRegex.test(clean)) {
    return {
      valid: false,
      formatted: clean,
      message: 'Invalid registration format. Use standard Indian format (e.g., KA04D1234 or KA01AB1234)',
    };
  }
  return { valid: true, formatted: clean };
}

