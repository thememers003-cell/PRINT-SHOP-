import crypto from 'crypto';

/**
 * Secure password hashing using Node.js crypto.scryptSync with per-user salt.
 * Fully compatible with plain-text passwords stored in initial seed migrations.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `$scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // Modern scrypt hashed password
  if (storedHash.startsWith('$scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const salt = parts[2];
    const originalHash = parts[3];
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(derivedKey.toString('hex')), Buffer.from(originalHash));
  }

  // Backwards compatibility for seed/development plain text passwords
  // Timing safe comparison to prevent timing attacks
  const bufA = Buffer.from(password.trim());
  const bufB = Buffer.from(storedHash.trim());
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
