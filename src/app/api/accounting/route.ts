export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const year  = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = searchParams.get('month') ?? ''

  const yearStart = `${year}-01-01`
  const yearEnd   = `${year}-12-31`

  let earningsQuery = supabase
    .from('earnings')
    .select('*, talent:talent(id, name, stage_name, agency_fee, tier)')
    .eq('year', year)
    .order('year',  { ascending: false })
    .order('month', { ascending: false })

  let expensesQuery = supabase
    .from('expenses')
    .select('*, talent:talent(id, name, stage_name)')
    .gte('date', yearStart)
    .lte('date', yearEnd)
    .order('date', { ascending: false })

  if (month) {
    earningsQuery = earningsQuery.eq('month', parseInt(month))
    const m  = parseInt(month)
    const mStart = `${year}-${String(m).padStart(2, '0')}-01`
    const mEnd   = new Date(year, m, 0).toISOString().split('T')[0]
    expensesQuery = expensesQuery.gte('date', mStart).lte('date', mEnd)
  }

  const [
    { data: earnings },
    { data: expenses },
    { data: talents },
  ] = await Promise.all([
    earningsQuery,
    expensesQuery,
    supabase.from('talent').select('id, name, stage_name, tier, agency_fee, earnings(amount), expenses(amount)'),
  ])

  const totalRevenue  = (earnings ?? []).reduce((s, e) => s + e.amount, 0)
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)

  const talentSummary = (talents ?? []).map((t: any) => {
    const gross   = (t.earnings as any[]).reduce((s: number, e: any) => s + e.amount, 0)
    const exp     = (t.expenses as any[]).reduce((s: number, e: any) => s + e.amount, 0)
    const agency  = gross * (t.agency_fee / 100)
    return {
      id:            t.id,
      name:          t.name,
      stageName:     t.stage_name,
      tier:          t.tier,
      agencyFee:     t.agency_fee,
      grossEarnings: gross,
      expenses:      exp,
      agencyRevenue: agency,
    }
  })

  // Monthly breakdown
  const monthlyMap: Record<number, { earnings: number; expenses: number }> = {}
  for (let i = 1; i <= 12; i++) monthlyMap[i] = { earnings: 0, expenses: 0 }
  for (const e of earnings  ?? []) monthlyMap[e.month].earnings  += e.amount
  for (const e of expenses  ?? []) {
    const m = new Date(e.date).getMonth() + 1
    if (monthlyMap[m]) monthlyMap[m].expenses += e.amount
  }
  const monthly = Object.entries(monthlyMap).map(([m, v]) => ({
    month:    parseInt(m),
    label:    new Date(year, parseInt(m) - 1).toLocaleString('default', { month: 'short' }),
    earnings: v.earnings,
    expenses: v.expenses,
    net:      v.earnings - v.expenses,
  }))

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalExpenses,
      netRevenue:    totalRevenue - totalExpenses,
      agencyRevenue: talentSummary.reduce((s, t) => s + t.agencyRevenue, 0),
    },
    talentSummary,
    monthly,
    recentEarnings: toCamel(earnings?.slice(0, 15) ?? []),
    recentExpenses: toCamel(expenses?.slice(0, 15) ?? []),
  })
}
