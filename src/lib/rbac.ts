import { supabase } from '@/lib/supabase'

export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER'

export const RANK: Record<Role, number> = { VIEWER: 0, MANAGER: 1, ADMIN: 2 }

export function hasRole(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false
  return RANK[role] >= RANK[min]
}

/**
 * Normalizes an email for the access-control decision, and rejects anything
 * that could be used for a homoglyph bypass (e.g. a Cyrillic "а" standing in
 * for Latin "a" so a look-alike address is treated as equivalent to a real
 * allow-listed one). This is the mitigation for a known Auth.js advisory
 * (its internal email normalizer runs before Unicode normalization) — rather
 * than depend on the library's handling, the actual allow/deny decision here
 * only ever compares normalized, ASCII-only strings. Every legitimate email
 * we care about (Gmail, GitHub, company domains) is plain ASCII, so this
 * costs nothing for real users while closing off the entire homoglyph class.
 * Returns null (deny) for anything that doesn't survive normalization.
 */
export function normalizeEmail(email: string): string | null {
  const normalized = email.normalize('NFKC').trim().toLowerCase()
  if (!normalized) return null
  // eslint-disable-next-line no-control-regex
  if (!/^[\x00-\x7f]+$/.test(normalized)) return null
  return normalized
}

async function getStaffRecord(normalizedEmail: string) {
  // .eq() for an exact match — .ilike() would treat the email as a LIKE
  // pattern, so a stray % or _ in an address could wildcard-match staff
  // rows that aren't actually the same address. Relies on staff.email
  // always being stored lowercase (enforced on insert in /api/staff).
  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle()
  return data
}

/**
 * Resolves whether an email may sign in, and with what role.
 *
 * ADMIN_EMAIL (env var) is a permanent break-glass admin, independent of the
 * staff table — this is what keeps a fresh install from locking everyone out
 * before anyone exists in `staff`. Everyone else must be an ACTIVE row there.
 */
export async function resolveAccess(
  email: string | null | undefined
): Promise<{ allowed: boolean; role: Role | null }> {
  if (!email) return { allowed: false, role: null }

  const normalized = normalizeEmail(email)
  if (!normalized) return { allowed: false, role: null }

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    const normalizedAdmin = normalizeEmail(adminEmail)
    if (normalizedAdmin && normalized === normalizedAdmin) {
      return { allowed: true, role: 'ADMIN' }
    }
  }

  const staff = await getStaffRecord(normalized)
  if (!staff || staff.status !== 'ACTIVE') return { allowed: false, role: null }
  return { allowed: true, role: staff.role as Role }
}
