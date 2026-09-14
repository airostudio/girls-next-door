export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, SupplierUpdateSchema } from '@/lib/validation'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { data, error } = await supabase.from('suppliers').select('*').eq('id', params.id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toCamel(data))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, SupplierUpdateSchema)
  if (!validation.ok) return validation.response
  const b = validation.data

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b.name         !== undefined) row.name          = b.name
  if (b.kind         !== undefined) row.kind          = b.kind
  if (b.contactName  !== undefined) row.contact_name  = b.contactName  || null
  if (b.contactEmail !== undefined) row.contact_email = b.contactEmail || null
  if (b.contactPhone !== undefined) row.contact_phone = b.contactPhone || null
  if (b.website      !== undefined) row.website       = b.website      || null
  if (b.city         !== undefined) row.city          = b.city         || null
  if (b.country      !== undefined) row.country       = b.country      || null
  if (b.dayRate      !== undefined) row.day_rate      = b.dayRate      ?? null
  if (b.currency     !== undefined) row.currency      = b.currency
  if (b.status       !== undefined) row.status        = b.status
  if (b.notes        !== undefined) row.notes         = b.notes        || null

  const { data, error } = await supabase.from('suppliers').update(row).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  // media rows cascade via the supplier_id foreign key.
  const { error } = await supabase.from('suppliers').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
