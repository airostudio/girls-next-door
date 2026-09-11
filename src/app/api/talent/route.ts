export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, TalentCreateSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const tier   = searchParams.get('tier')   ?? ''

  let query = supabase.from('talent').select('*, earnings(amount), campaign_talent(id)').order('joined_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (tier)   query = query.eq('tier',   tier)
  if (search) query = query.or(`name.ilike.%${search}%,stage_name.ilike.%${search}%,tags.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map(t => ({
    ...toCamel(t),
    totalEarnings: (t.earnings as any[]).reduce((s: number, e: any) => s + e.amount, 0),
    earnings:      undefined,
    campaignTalent: undefined,
    _count: { campaigns: (t.campaign_talent as any[]).length, earnings: (t.earnings as any[]).length },
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, TalentCreateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const row: any = {
    name:           body.name,
    stage_name:     body.stageName,
    email:          body.email,
    phone:          body.phone,
    nationality:    body.nationality,
    bio:            body.bio,
    avatar:         body.avatar,
    status:         body.status ?? 'ACTIVE',
    tier:           body.tier   ?? 'STANDARD',
    agency_fee:     body.agencyFee ?? 20,
    tags:           body.tags,
    platform_links: body.platformLinks,
    social_links:   body.socialLinks,
  }
  const { data, error } = await supabase.from('talent').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data), { status: 201 })
}
