export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, DealUpdateSchema } from '@/lib/validation'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, DealUpdateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row: any = { updated_at: new Date().toISOString() }
  if (body.talentId    !== undefined) row.talent_id   = body.talentId
  if (body.title       !== undefined) row.title       = body.title
  if (body.status      !== undefined) row.status      = body.status
  if (body.value       !== undefined) row.value       = body.value
  if (body.currency    !== undefined) row.currency    = body.currency
  if (body.startDate   !== undefined) row.start_date  = body.startDate
  if (body.endDate     !== undefined) row.end_date    = body.endDate
  if (body.description !== undefined) row.description = body.description

  const { data, error } = await supabase.from('deals').update(row).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('deals').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
