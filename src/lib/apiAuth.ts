import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { RANK, type AccountType, type Role } from '@/lib/rbac'

type RequireRoleResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> }
  | { ok: false; response: NextResponse }

/**
 * Call at the top of an API route handler: `const auth = await requireRole('MANAGER')`,
 * then `if (!auth.ok) return auth.response`. Centralizes the 401/403 shape so
 * every route enforces the same session + role check the same way.
 *
 * Guards the agency side of the app, so it asserts STAFF as well as role rank.
 * Rank alone is not enough: most routes here are gated at VIEWER — the floor of
 * the ladder — so any non-staff account holding a role at all would read the
 * agency's finances and every talent's earnings. There is no lower rank to put
 * such an account on, which is why account type is checked separately.
 *
 * A future talent/supplier portal needs its own helper that scopes queries to
 * the signed-in account; it must not reuse this one.
 */
export async function requireRole(min: Role): Promise<RequireRoleResult> {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const role = user?.role as Role | undefined
  const accountType = user?.accountType as AccountType | undefined

  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  // Sessions issued before accountType existed carry no value; those can only
  // be staff, since nothing else has ever been able to sign in.
  if (accountType !== undefined && accountType !== 'STAFF') {
    return { ok: false, response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }
  if (!role || RANK[role] < RANK[min]) {
    return { ok: false, response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }
  return { ok: true, session }
}

type RequireAccountResult =
  | { ok: true; accountType: 'TALENT' | 'SUPPLIER'; accountId: string; table: 'talent' | 'suppliers' }
  | { ok: false; response: NextResponse }

/**
 * Guards the member portal. Returns the caller's own record id, taken from the
 * session — never from the request.
 *
 * That is the whole point. A portal route that accepted an owner id from the
 * URL or body would let any signed-in member read or edit any other member's
 * data by changing a number. Every portal query scopes to the id this returns.
 *
 * Pass a type to restrict a route to one side of the marketplace; omit it for
 * routes both use, such as profile and media.
 */
export async function requireAccount(only?: 'TALENT' | 'SUPPLIER'): Promise<RequireAccountResult> {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const accountType = user?.accountType as AccountType | undefined
  const accountId = user?.accountId as string | undefined

  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  if (accountType !== 'TALENT' && accountType !== 'SUPPLIER') {
    return { ok: false, response: NextResponse.json({ error: 'Not a member account' }, { status: 403 }) }
  }
  if (only && accountType !== only) {
    return { ok: false, response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }
  // A member session without an account id can't be scoped to anything, so it
  // must be refused rather than allowed to fall through to an unscoped query.
  if (!accountId) {
    return { ok: false, response: NextResponse.json({ error: 'Account is not linked to a record' }, { status: 403 }) }
  }

  return {
    ok: true,
    accountType,
    accountId,
    table: accountType === 'TALENT' ? 'talent' : 'suppliers',
  }
}
