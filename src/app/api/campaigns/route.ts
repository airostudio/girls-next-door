export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, CampaignCreateSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? ''

  let query = supabase
    .from('campaigns')
    .select('*, talents:campaign_talent(talent:talent(id, name, avatar))')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toCamel(data ?? []))
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, CampaignCreateSchema)
  if (!validation.ok) return validation.response
  const { talentIds, ...body } = validation.data

  const row: any = {
    title:       body.title,
    description: body.description,
    type:        body.type,
    status:      body.status ?? 'DRAFT',
    start_date:  body.startDate,
    end_date:    body.endDate ?? null,
    budget:      body.budget ?? null,
    goal:        body.goal,
    platform:    body.platform,
  }

  const { data: campaign, error } = await supabase.from('campaigns').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (talentIds?.length) {
    await supabase.from('campaign_talent').insert(
      talentIds.map((id: string) => ({ campaign_id: campaign.id, talent_id: id }))
    )
  }

  return NextResponse.json(toCamel(campaign), { status: 201 })
}
