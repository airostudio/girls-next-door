import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { RANK, type Role } from '@/lib/rbac'

type RequireRoleResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> }
  | { ok: false; response: NextResponse }

/**
 * Call at the top of an API route handler: `const auth = await requireRole('MANAGER')`,
 * then `if (!auth.ok) return auth.response`. Centralizes the 401/403 shape so
 * every route enforces the same session + role check the same way.
 */
export async function requireRole(min: Role): Promise<RequireRoleResult> {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role as Role | undefined

  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  if (!role || RANK[role] < RANK[min]) {
    return { ok: false, response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }
  return { ok: true, session }
}
