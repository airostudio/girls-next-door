export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, ClientUpdateSchema } from '@/lib/validation'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const [{ data: client, error }, { data: deals }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', params.id).single(),
    supabase.from('deals').select('*, talent:talent(id, name, avatar)').eq('client_id', params.id).order('created_at', { ascending: false }),
  ])

  if (error || !client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(toCamel({ ...client, deals: deals ?? [] }))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, ClientUpdateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row: any = { updated_at: new Date().toISOString() }
  if (body.name         !== undefined) row.name          = body.name
  if (body.contactName  !== undefined) row.contact_name  = body.contactName
  if (body.contactEmail !== undefined) row.contact_email = body.contactEmail
  if (body.contactPhone !== undefined) row.contact_phone = body.contactPhone
  if (body.website      !== undefined) row.website       = body.website
  if (body.industry     !== undefined) row.industry      = body.industry
  if (body.status       !== undefined) row.status        = body.status
  if (body.notes        !== undefined) row.notes         = body.notes

  const { data, error } = await supabase.from('clients').update(row).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('clients').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
