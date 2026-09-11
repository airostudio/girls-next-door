export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, ClientCreateSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  let query = supabase
    .from('clients')
    .select('*, deals(id, status, value)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (search) query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,industry.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((c: any) => ({
    ...toCamel(c),
    dealCount:  (c.deals as any[]).length,
    dealValue:  (c.deals as any[]).reduce((s: number, d: any) => s + (d.value ?? 0), 0),
    activeDeals: (c.deals as any[]).filter((d: any) => d.status === 'ACTIVE').length,
    deals: undefined,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, ClientCreateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row = {
    name:          body.name,
    contact_name:  body.contactName,
    contact_email: body.contactEmail || undefined,
    contact_phone: body.contactPhone,
    website:       body.website || undefined,
    industry:      body.industry,
    status:        body.status ?? 'PROSPECT',
    notes:         body.notes,
  }

  const { data, error } = await supabase.from('clients').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data), { status: 201 })
}
