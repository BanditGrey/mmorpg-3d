import crypto from 'node:crypto';

const configuredSessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && (!configuredSessionSecret || configuredSessionSecret.length < 32)) {
  throw new Error('SESSION_SECRET must be configured with at least 32 characters in production');
}
const SECRET = configuredSessionSecret ?? crypto.randomBytes(32).toString('hex');
const configuredAdminKey = process.env.ADMIN_KEY;
if (process.env.NODE_ENV === 'production' && (!configuredAdminKey || configuredAdminKey.length < 32)) {
  throw new Error('ADMIN_KEY must be configured with at least 32 characters in production');
}
if (!configuredAdminKey) {
  console.warn('[security] ADMIN_KEY is unset; admin API is disabled in this development process.');
}
export const ADMIN_KEY = configuredAdminKey ?? null;

export function adminKeyMatches(candidate: string | undefined): boolean {
  if (!ADMIN_KEY || !candidate) return false;
  const provided = Buffer.from(candidate);
  const expected = Buffer.from(ADMIN_KEY);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export interface TokenPayload {
  accountId: string;
  username: string;
  role: 'player' | 'admin';
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlMs = 7 * 24 * 3600 * 1000): string {
  const full: TokenPayload = { ...payload, exp: Date.now() + ttlMs };
  const b64 = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as TokenPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
