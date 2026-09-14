export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireAccount } from '@/lib/apiAuth'

/** Columns a member may see and edit on their own record, by account type. */
const READABLE: Record<string, string> = {
  talent:    'id, name, stage_name, email, phone, nationality, bio, avatar, status, tier, tags, platform_links, social_links, joined_at',
  suppliers: 'id, name, kind, contact_name, contact_email, contact_phone, website, city, country, day_rate, currency, status, created_at',
}

/**
 * Deliberately narrow. The talent row also carries agency_fee and contract_end,
 * and the supplier row carries the agency's own notes — commercial terms the
 * member is not party to. Selecting explicit columns keeps them server-side
 * even as the tables grow.
 */
const EDITABLE: Record<string, string[]> = {
  talent:    ['name', 'stage_name', 'phone', 'nationality', 'bio', 'tags', 'platform_links', 'social_links'],
  suppliers: ['name', 'contact_name', 'contact_phone', 'website', 'city', 'country', 'day_rate'],
}

const snake = (s: string) => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase())

export async function GET() {
  const auth = await requireAccount()
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from(auth.table)
    .select(READABLE[auth.table])
    .eq('id', auth.accountId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ accountType: auth.accountType, profile: toCamel(data) })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAccount()
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Allow-list, not deny-list: anything not named here is dropped silently, so
  // a member can never write status, tier, agency_fee or auth_user_id by
  // including them in the payload.
  const allowed = EDITABLE[auth.table]
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    const column = snake(key)
    if (allowed.includes(column)) {
      row[column] = typeof value === 'string' && value.trim() === '' ? null : value
    }
  }

  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  row.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from(auth.table)
    .update(row)
    .eq('id', auth.accountId)
    .select(READABLE[auth.table])
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ accountType: auth.accountType, profile: toCamel(data) })
}
