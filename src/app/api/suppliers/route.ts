export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, SupplierCreateSchema } from '@/lib/validation'

export async function GET() {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('suppliers')
    .select('*, media(url, is_primary)')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toCamel(data ?? []))
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, SupplierCreateSchema)
  if (!validation.ok) return validation.response
  const b = validation.data

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name:          b.name,
      kind:          b.kind ?? 'OTHER',
      contact_name:  b.contactName  || null,
      contact_email: b.contactEmail || null,
      contact_phone: b.contactPhone || null,
      website:       b.website      || null,
      city:          b.city         || null,
      country:       b.country      || null,
      day_rate:      b.dayRate      ?? null,
      currency:      b.currency ?? 'USD',
      status:        b.status   ?? 'ACTIVE',
      notes:         b.notes        || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data), { status: 201 })
}
