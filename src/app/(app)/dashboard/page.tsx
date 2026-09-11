'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import {
  Users, DollarSign, TrendingUp, Megaphone,
  ArrowUpRight, Crown, Star,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { formatCurrency, TIER_COLORS, CAMPAIGN_STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'

interface DashboardData {
  kpi: {
    totalTalent: number; activeTalent: number; totalRevenue: number
    agencyRevenue: number; activeCampaigns: number; avgEarnings: number
  }
  recentTalent: any[]
  recentCampaigns: any[]
  monthlyEarnings: { label: string; revenue: number }[]
  topEarners: any[]
}

function StatCard({ icon: Icon, label, value, delta, color }: {
  icon: any; label: string; value: string; delta?: string; color: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {delta && (
          <div className="stat-delta text-emerald-400 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> {delta}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData)
  }, [])

  if (!data) {
    return (
      <>
        <Topbar title="Dashboard" subtitle="Welcome back" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  const { kpi, recentTalent, recentCampaigns, monthlyEarnings, topEarners } = data

  return (
    <>
      <Topbar title="Dashboard" subtitle="Platform overview" />

      <div className="p-6 space-y-6 max-w-[1400px]">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Active Talent"
            value={`${kpi.activeTalent} / ${kpi.totalTalent}`}
            delta="+1 this month"
            color="text-blue-400 bg-blue-400/10"
          />
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={formatCurrency(kpi.totalRevenue)}
            delta="All time"
            color="text-emerald-400 bg-emerald-400/10"
          />
          <StatCard
            icon={TrendingUp}
            label="Agency Revenue"
            value={formatCurrency(kpi.agencyRevenue)}
            delta="20% avg fee"
            color="text-purple-400 bg-purple-400/10"
          />
          <StatCard
            icon={Megaphone}
            label="Active Campaigns"
            value={String(kpi.activeCampaigns)}
            color="text-amber-400 bg-amber-400/10"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue chart */}
          <div className="card lg:col-span-2">
            <h3 className="section-title">Revenue Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyEarnings} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b5bfd" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#161b26', border: '1px solid #1e2535', borderRadius: 8 }}
                  formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b5bfd" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top earners */}
          <div className="card">
            <h3 className="section-title flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" /> Top Earners
            </h3>
            <div className="space-y-3">
              {topEarners.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-4">No data this month</p>
              )}
              {topEarners.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-500 w-4">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-xs font-bold text-stone-300 flex-shrink-0">
                    {t.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{t.stageName || t.name}</div>
                    <div className="text-xs text-stone-400">{t.tier}</div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-400">{formatCurrency(t.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent talent */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Recent Talent</h3>
              <Link href="/talent" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
            </div>
            <div className="space-y-2">
              {recentTalent.map(t => (
                <Link key={t.id} href={`/talent/${t.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-sm font-bold text-brand-400 flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{t.name}</div>
                    <div className="text-xs text-stone-400">{t.stageName || '—'}</div>
                  </div>
                  <span className={`badge ${TIER_COLORS[t.tier]}`}>{t.tier}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Active campaigns */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Active Campaigns</h3>
              <Link href="/marketing" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
            </div>
            <div className="space-y-2">
              {recentCampaigns.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-4">No active campaigns</p>
              )}
              {recentCampaigns.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{c.title}</div>
                    <div className="text-xs text-stone-400">{c.platform ?? 'Multi-platform'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`badge ${CAMPAIGN_STATUS_COLORS[c.status]}`}>{c.status}</span>
                    {c.budget && (
                      <div className="text-xs text-stone-400 mt-0.5">
                        {formatCurrency(c.spent)} / {formatCurrency(c.budget)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
