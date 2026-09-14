export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, ApplicationReviewSchema } from '@/lib/validation'

/**
 * Moves an application through review.
 *
 * Approving records a decision; it does NOT create a login. Converting an
 * approved applicant into a talent or supplier is a separate, explicit action,
 * and staff access remains the `staff` allow-list only.
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
  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('applications').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
