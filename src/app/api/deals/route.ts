export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, DealCreateSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status') ?? ''
  const clientId = searchParams.get('clientId') ?? ''

  let query = supabase
    .from('deals')
    .select('*, client:clients(id, name), talent:talent(id, name, avatar)')
    .order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toCamel(data ?? []))
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, DealCreateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row = {
    client_id:   body.clientId,
    talent_id:   body.talentId,
    title:       body.title,
    status:      body.status ?? 'PROSPECT',
    value:       body.value,
    currency:    body.currency ?? 'USD',
    start_date:  body.startDate,
    end_date:    body.endDate,
    description: body.description,
  }

  const { data, error } = await supabase.from('deals').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data), { status: 201 })
}
