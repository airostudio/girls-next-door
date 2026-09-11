export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, CampaignUpdateSchema } from '@/lib/validation'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('campaigns')
    .select('*, talents:campaign_talent(talent:talent(id, name, avatar))')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toCamel(data))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, CampaignUpdateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row: any = {}
  if (body.title       !== undefined) row.title       = body.title
  if (body.description !== undefined) row.description = body.description
  if (body.type        !== undefined) row.type        = body.type
  if (body.status      !== undefined) row.status      = body.status
  if (body.startDate   !== undefined) row.start_date  = body.startDate
  if (body.endDate     !== undefined) row.end_date    = body.endDate
  if (body.budget      !== undefined) row.budget      = body.budget
  if (body.spent       !== undefined) row.spent       = body.spent
  if (body.goal        !== undefined) row.goal        = body.goal
  if (body.platform    !== undefined) row.platform    = body.platform
  if (body.metrics     !== undefined) row.metrics     = body.metrics
  row.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('campaigns').update(row).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('campaigns').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
