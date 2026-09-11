export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, AgencySettingsSchema } from '@/lib/validation'

export async function GET() {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { data } = await supabase.from('agency_settings').select('*').eq('id', 'default').single()
  return NextResponse.json(toCamel(data))
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, AgencySettingsSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row: any = {}
  if (body.agencyName   !== undefined) row.agency_name   = body.agencyName
  if (body.currency     !== undefined) row.currency      = body.currency
  if (body.defaultFee   !== undefined) row.default_fee   = body.defaultFee
  if (body.contactEmail !== undefined) row.contact_email = body.contactEmail
  if (body.contactPhone !== undefined) row.contact_phone = body.contactPhone
  if (body.address      !== undefined) row.address       = body.address
  if (body.taxId        !== undefined) row.tax_id        = body.taxId

  const { data, error } = await supabase
    .from('agency_settings')
    .upsert({ id: 'default', ...row })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data))
}
