'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import {
  Plus, Megaphone, Target, TrendingUp, CheckCircle2,
  Clock, PauseCircle, FileEdit, Filter, ExternalLink,
} from 'lucide-react'
import { formatCurrency, formatDate, CAMPAIGN_STATUS_COLORS } from '@/lib/utils'
import type { Campaign } from '@/types'
import AddCampaignModal from '@/components/marketing/AddCampaignModal'
import CampaignDetailModal from '@/components/marketing/CampaignDetailModal'

const STATUS_OPTIONS = ['', 'ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED']

const TYPE_ICONS: Record<string, any> = {
  LAUNCH:     Megaphone,
  PROMOTION:  Target,
  COLLAB:     TrendingUp,
  SEASONAL:   CheckCircle2,
  SOCIAL_PUSH: TrendingUp,
}

export default function MarketingPage() {
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([])
  const [loading,    setLoading]    = useState(true)
  const [status,     setStatus]     = useState('')
  const [showAdd,    setShowAdd]    = useState(false)
  const [selected,   setSelected]   = useState<Campaign | null>(null)

  const load = (s = status) => {
    setLoading(true)
    const p = new URLSearchParams()
    if (s) p.set('status', s)
    fetch(`/api/campaigns?${p}`).then(r => r.json()).then(d => { setCampaigns(d); setLoading(false) })
  }

  useEffect(() => { load() }, [status])

  // Aggregate metrics
  const active    = campaigns.filter(c => c.status === 'ACTIVE').length
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0)
  const totalSpent  = campaigns.reduce((s, c) => s + c.spent, 0)
  const completed   = campaigns.filter(c => c.status === 'COMPLETED').length

  return (
    <>
      <Topbar title="Marketing" subtitle="Campaign management and performance" />

      <div className="p-6 space-y-5 max-w-[1400px]">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Campaigns', value: active,                   color: 'text-emerald-400 bg-emerald-400/10' },
            { label: 'Total Budget',     value: formatCurrency(totalBudget), color: 'text-blue-400 bg-blue-400/10' },
            { label: 'Total Spent',      value: formatCurrency(totalSpent),  color: 'text-amber-400 bg-amber-400/10' },
            { label: 'Completed',        value: completed,                  color: 'text-purple-400 bg-purple-400/10' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</div>
              <div className="text-xs text-stone-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center justify-between flex-wrap">
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-muted text-stone-400 hover:text-white'
                }`}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No campaigns found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} onClick={() => setSelected(c)} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddCampaignModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); load() }}
        />
      )}
      {selected && (
        <CampaignDetailModal
          campaign={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { setSelected(null); load() }}
        />
      )}
    </>
  )
}

function CampaignCard({ campaign: c, onClick }: { campaign: Campaign; onClick: () => void }) {
  const metrics   = c.metrics ? JSON.parse(c.metrics) : null
  const budgetPct = c.budget ? Math.min((c.spent / c.budget) * 100, 100) : 0
  const Icon      = TYPE_ICONS[c.type] ?? Megaphone

  return (
    <button onClick={onClick}
      className="card text-left hover:border-brand-600/40 transition-colors w-full group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-600/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-brand-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{c.title}</div>
            <div className="text-xs text-stone-400">{c.type.replace('_', ' ')}</div>
          </div>
        </div>
        <span className={`badge flex-shrink-0 ${CAMPAIGN_STATUS_COLORS[c.status]}`}>{c.status}</span>
      </div>

      {c.description && (
        <p className="text-xs text-stone-400 line-clamp-2 mb-3 leading-relaxed">{c.description}</p>
      )}

      {/* Budget bar */}
      {c.budget && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-stone-400 mb-1.5">
            <span>Budget spend</span>
            <span>{formatCurrency(c.spent)} / {formatCurrency(c.budget)}</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : 'bg-brand-500'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-surface rounded-lg p-2 text-center">
            <div className="text-xs font-semibold text-white">{(metrics.impressions / 1000).toFixed(0)}k</div>
            <div className="text-[10px] text-stone-500">Impressions</div>
          </div>
          <div className="bg-surface rounded-lg p-2 text-center">
            <div className="text-xs font-semibold text-white">{metrics.conversions?.toLocaleString()}</div>
            <div className="text-[10px] text-stone-500">Conversions</div>
          </div>
          <div className="bg-surface rounded-lg p-2 text-center">
            <div className="text-xs font-semibold text-emerald-400">{formatCurrency(metrics.revenue)}</div>
            <div className="text-[10px] text-stone-500">Revenue</div>
          </div>
        </div>
      )}

      {/* Talent avatars */}
      {c.talents && c.talents.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 pt-3 border-t border-surface-border">
          <div className="flex -space-x-1.5">
            {c.talents.slice(0, 4).map(({ talent }) => (
              <div key={talent.id}
                className="w-6 h-6 rounded-full bg-brand-600/20 border border-surface-card flex items-center justify-center text-xs font-bold text-brand-400">
                {talent.name.charAt(0)}
              </div>
            ))}
          </div>
          <span className="text-xs text-stone-400">{c.talents.length} talent{c.talents.length !== 1 ? 's' : ''}</span>
          {c.platform && (
            <span className="ml-auto text-xs text-stone-500">{c.platform}</span>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="text-xs text-stone-500 mt-2">
        {formatDate(c.startDate)}{c.endDate ? ` → ${formatDate(c.endDate)}` : ' (ongoing)'}
      </div>
    </button>
  )
}
