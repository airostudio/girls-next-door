export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, StaffUpdateSchema } from '@/lib/validation'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, StaffUpdateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row: any = { updated_at: new Date().toISOString() }
  if (body.name   !== undefined) row.name   = body.name
  if (body.role   !== undefined) row.role   = body.role
  if (body.status !== undefined) row.status = body.status

  const { data, error } = await supabase.from('staff').update(row).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('staff').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
