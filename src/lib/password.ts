import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>

/**
 * scrypt rather than bcrypt or argon2: it's in Node's standard library, so
 * there's no native module to build and nothing extra to keep patched. The cost
 * parameters are stored alongside each hash, so raising them later doesn't
 * invalidate existing passwords — old hashes keep verifying with the params
 * they were written with.
 */
const N = 16384 // ~16 MB of memory per hash
const R = 8
const P = 1
const KEYLEN = 64
const SALT_BYTES = 16

export const MIN_PASSWORD_LENGTH = 12

/** Serialised as scrypt$N$r$p$salt$hash so the format is self-describing. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P })
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

/**
 * Always does the full key derivation, even for a malformed or missing hash, so
 * a request for an account with no password set takes the same time as one for
 * an account that has one. Otherwise response timing reveals which staff
 * members have passwords.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const parts = (stored ?? '').split('$')
  const usable = parts.length === 6 && parts[0] === 'scrypt'

  const n = usable ? Number(parts[1]) : N
  const r = usable ? Number(parts[2]) : R
  const p = usable ? Number(parts[3]) : P
  const salt = usable ? Buffer.from(parts[4], 'base64') : randomBytes(SALT_BYTES)
  const expected = usable ? Buffer.from(parts[5], 'base64') : randomBytes(KEYLEN)

  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || expected.length === 0) {
    return false
  }

  let derived: Buffer
  try {
    derived = await scrypt(password.normalize('NFKC'), salt, expected.length, { N: n, r, p })
  } catch {
    return false
  }

  if (derived.length !== expected.length) return false
  const match = timingSafeEqual(derived, expected)
  return usable && match
}

/** Returns null when acceptable, otherwise the reason to show the user. */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (password.length > 200) {
    return 'That password is too long.'
  }
  if (!/[^a-zA-Z]/.test(password)) {
    return 'Include at least one number or symbol.'
  }
  return null
}
