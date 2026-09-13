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
