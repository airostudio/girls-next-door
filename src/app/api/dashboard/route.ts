export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'

export async function GET() {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const [
    { count: totalTalent },
    { count: activeTalent },
    { count: activeCampaigns },
    { data: allEarnings },
    { data: recentTalent },
    { data: recentCampaigns },
  ] = await Promise.all([
    supabase.from('talent').select('*', { count: 'exact', head: true }),
    supabase.from('talent').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('earnings').select('amount, month, year, talent_id'),
    supabase.from('talent').select('id, name, stage_name, avatar, tier, status').order('joined_at', { ascending: false }).limit(5),
    supabase.from('campaigns').select('id, title, type, status, budget, spent, platform').in('status', ['ACTIVE', 'DRAFT']).order('created_at', { ascending: false }).limit(4),
  ])

  const totalRevenue  = (allEarnings ?? []).reduce((s, e) => s + e.amount, 0)
  const agencyRevenue = totalRevenue * 0.2
  const avgEarnings   = (activeTalent ?? 0) > 0 ? totalRevenue / (activeTalent ?? 1) : 0

  // Monthly breakdown (last 6 months)
  const monthMap: Record<string, number> = {}
  for (const e of allEarnings ?? []) {
    const key = `${e.month}/${e.year}`
    monthMap[key] = (monthMap[key] ?? 0) + e.amount
  }
  const monthlyEarnings = Object.entries(monthMap)
    .slice(-6)
    .map(([label, revenue]) => ({ label, revenue }))

  // Top earners this month
  const now = new Date()
  const thisMonthEarnings = (allEarnings ?? []).filter(
    e => e.month === now.getMonth() + 1 && e.year === now.getFullYear()
  )
  const earnerMap: Record<string, number> = {}
  for (const e of thisMonthEarnings) {
    earnerMap[e.talent_id] = (earnerMap[e.talent_id] ?? 0) + e.amount
  }
  const topTalentIds = Object.entries(earnerMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id)

  const { data: topTalentData } = topTalentIds.length
    ? await supabase.from('talent').select('id, name, stage_name, avatar, tier').in('id', topTalentIds)
    : { data: [] }

  const topEarners = topTalentIds.map(id => ({
    ...topTalentData?.find(t => t.id === id),
    amount: earnerMap[id],
  }))

  return NextResponse.json({
    kpi: { totalTalent, activeTalent, totalRevenue, agencyRevenue, activeCampaigns, avgEarnings },
    recentTalent:    toCamel(recentTalent ?? []),
    recentCampaigns: toCamel(recentCampaigns ?? []),
    monthlyEarnings,
    topEarners:      toCamel(topEarners),
  })
}
