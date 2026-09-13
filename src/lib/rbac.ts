import { supabase } from '@/lib/supabase'

export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER'

/**
 * Which kind of principal a session belongs to. Deliberately a separate axis
 * from Role rather than another rung below VIEWER.
 *
 * Every agency route is gated at VIEWER, the floor of the role ladder — so a
 * non-staff account given any role at all would read the agency's finances and
 * every talent's earnings. There is no lower rung to demote them to. Account
 * type is therefore checked independently, and `requireRole` refuses anything
 * that isn't STAFF.
 *
 * Only STAFF is issued today; TALENT and SUPPLIER exist so that adding a
 * self-service portal later is an additive change rather than a rewrite of
 * every route's auth check.
 */
export type AccountType = 'STAFF' | 'TALENT' | 'SUPPLIER'

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
 * we care about (Gmail, company domains) is plain ASCII, so this
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

export async function getStaffByEmail(normalizedEmail: string) {
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

export interface Access {
  allowed: boolean
  role: Role | null
  accountType: AccountType | null
}

const DENY: Access = { allowed: false, role: null, accountType: null }

/**
 * Resolves whether an email may sign in, with what role, and as what kind of
 * account.
 *
 * ADMIN_EMAIL (env var) is a permanent break-glass admin, independent of the
 * staff table — this is what keeps a fresh install from locking everyone out
 * before anyone exists in `staff`. Everyone else must be an ACTIVE row there.
 *
 * Talent rows are NOT consulted: talent are records, not users. Giving them a
 * session is a product decision that needs portal routes and per-account
 * scoping to exist first.
 */
export async function resolveAccess(
  email: string | null | undefined
): Promise<Access> {
  if (!email) return DENY

  const normalized = normalizeEmail(email)
  if (!normalized) return DENY

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    const normalizedAdmin = normalizeEmail(adminEmail)
    if (normalizedAdmin && normalized === normalizedAdmin) {
      return { allowed: true, role: 'ADMIN', accountType: 'STAFF' }
    }
  }

  const staff = await getStaffByEmail(normalized)
  if (!staff || staff.status !== 'ACTIVE') return DENY
  return { allowed: true, role: staff.role as Role, accountType: 'STAFF' }
}
