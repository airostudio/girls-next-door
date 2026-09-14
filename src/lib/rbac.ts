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
  /** The talent or supplier row this login owns. Null for staff. */
  accountId: string | null
}

const DENY: Access = { allowed: false, role: null, accountType: null, accountId: null }

/**
 * Finds a portal record by email among ACTIVE rows only.
 *
 * The email match happens once, at sign-in, and the caller then pins the login
 * to the row via auth_user_id. Re-matching on every request would mean a later
 * email change could silently re-point a session at somebody else's record.
 */
async function findPortalRecord(
  table: 'talent' | 'suppliers',
  emailColumn: 'email' | 'contact_email',
  normalizedEmail: string,
) {
  const { data } = await supabase
    .from(table)
    .select('id, status, auth_user_id')
    .eq(emailColumn, normalizedEmail)
    .eq('status', 'ACTIVE')
    .maybeSingle()
  return data
}

/**
 * Resolves whether an email may sign in, with what role, and as what kind of
 * account.
 *
 * Checked in priority order, and the order matters: an address that is both
 * staff and a talent record signs in as staff, because staff is the more
 * privileged identity and should never be silently downgraded.
 *
 *   1. ADMIN_EMAIL   — permanent break-glass admin, independent of the database,
 *                      so a fresh install or an outage can't lock everyone out
 *   2. staff         — the agency team, with a role
 *   3. talent        — portal account, scoped to its own record
 *   4. suppliers     — portal account, scoped to its own record
 *
 * Portal accounts get no Role at all. Role governs the agency CRM, and
 * requireRole additionally asserts STAFF, so a portal session cannot reach it
 * even if a role were somehow attached.
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
      return { allowed: true, role: 'ADMIN', accountType: 'STAFF', accountId: null }
    }
  }

  // A database that can't be reached must deny rather than throw: an
  // unhandled error here surfaces as a 500 from the sign-in route instead of a
  // refusal. ADMIN_EMAIL is checked above, so the break-glass account still
  // works through an outage.
  let staff: Awaited<ReturnType<typeof getStaffByEmail>> = null
  try {
    staff = await getStaffByEmail(normalized)
  } catch {
    return DENY
  }
  if (staff && staff.status === 'ACTIVE') {
    return { allowed: true, role: staff.role as Role, accountType: 'STAFF', accountId: null }
  }

  // Portal accounts. A failed lookup denies rather than throwing, for the same
  // reason as the staff lookup above.
  try {
    const talent = await findPortalRecord('talent', 'email', normalized)
    if (talent) {
      return { allowed: true, role: null, accountType: 'TALENT', accountId: talent.id }
    }
    const supplier = await findPortalRecord('suppliers', 'contact_email', normalized)
    if (supplier) {
      return { allowed: true, role: null, accountType: 'SUPPLIER', accountId: supplier.id }
    }
  } catch {
    return DENY
  }

  return DENY
}

/**
 * Pins a login to the record it resolved to, so later lookups don't depend on
 * the email still matching. Best-effort: a failure here must not block a
 * sign-in that has already been authorised.
 */
export async function linkAuthUser(
  accountType: AccountType,
  accountId: string,
  authUserId: string,
): Promise<void> {
  const table = accountType === 'TALENT' ? 'talent' : accountType === 'SUPPLIER' ? 'suppliers' : null
  if (!table) return
  try {
    await supabase.from(table).update({ auth_user_id: authUserId }).eq('id', accountId).is('auth_user_id', null)
  } catch {
    // Non-fatal — resolveAccess still finds them by email next time.
  }
}
