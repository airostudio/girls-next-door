export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, ApplicationReviewSchema } from '@/lib/validation'
import { provisionFromApplication, revokeForApplication } from '@/lib/applicationApproval'

/**
 * Moves an application through review.
 *
 * Approving creates the talent or supplier record the applicant's login
 * resolves to, so their next sign-in lands on their own profile instead of
 * being refused and sent back to the join form.
 *
 * It never creates a `staff` row. Every agency route is gated at VIEWER, the
 * floor of the role ladder, so staff access would hand an applicant the
 * agency's books and every model's earnings. Members have no role at all.
 *
 * Moving an approved application to any other status deactivates the record it
 * created, so a decision can be withdrawn.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, ApplicationReviewSchema)
  if (!validation.ok) return validation.response
  const b = validation.data

  const { data, error } = await supabase
    .from('applications')
    .update({
      status:      b.status,
      review_note: b.reviewNote ?? null,
      reviewed_by: (auth.session as any)?.user?.email ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // After the status is recorded, not before: if provisioning fails, the
  // decision still stands and staff can see it, rather than the click appearing
  // to have done nothing at all.
  let account: { created: boolean; table?: string; id?: string; reason?: string } | undefined
  if (b.status === 'APPROVED') {
    const result = await provisionFromApplication(data as any)
    account = result.created
      ? { created: true, table: result.table, id: result.id }
      : { created: false, reason: result.reason }
    if (!result.created && result.reason === 'failed') {
      console.error('[applications] approving %s did not create an account: %s', params.id, result.detail)
    }
  } else {
    // Withdrawing an approval. A no-op unless this application produced a record.
    await revokeForApplication(params.id)
  }

  return NextResponse.json({ ...toCamel(data), account })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('applications').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
