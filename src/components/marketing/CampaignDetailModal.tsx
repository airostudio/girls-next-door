'use client'

import { X, Trash2, Target, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate, CAMPAIGN_STATUS_COLORS, TIER_COLORS } from '@/lib/utils'
import type { Campaign } from '@/types'

interface Props { campaign: Campaign; onClose: () => void; onRefresh: () => void }

export default function CampaignDetailModal({ campaign: c, onClose, onRefresh }: Props) {
  const metrics = c.metrics ? JSON.parse(c.metrics) : null
  const budgetPct = c.budget ? Math.min((c.spent / c.budget) * 100, 100) : 0

  async function handleDelete() {
    if (!confirm('Delete this campaign?')) return
    await fetch(`/api/campaigns/${c.id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div>
            <h2 className="text-lg font-semibold text-white">{c.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-400">{c.type.replace('_', ' ')}</span>
              <span className={`badge ${CAMPAIGN_STATUS_COLORS[c.status]}`}>{c.status}</span>
              {c.platform && <span className="text-xs text-stone-400">· {c.platform}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="btn-danger text-xs flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-stone-400 hover:text-white" /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {c.description && (
            <p className="text-sm text-stone-300 leading-relaxed">{c.description}</p>
          )}

          {/* Dates & Goal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-surface">
              <div className="text-xs text-stone-400 mb-1">Timeline</div>
              <div className="text-sm text-white font-medium">
                {formatDate(c.startDate)}
                {c.endDate && <> → {formatDate(c.endDate)}</>}
                {!c.endDate && ' (ongoing)'}
              </div>
            </div>
            {c.goal && (
              <div className="card bg-surface">
                <div className="text-xs text-stone-400 mb-1">Goal</div>
                <div className="text-sm text-white font-medium">{c.goal}</div>
              </div>
            )}
          </div>

          {/* Budget */}
          {c.budget && (
            <div className="card bg-surface">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-400">Budget utilisation</span>
                <span className="font-semibold text-white">
                  {formatCurrency(c.spent)} / {formatCurrency(c.budget)} ({budgetPct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${budgetPct > 90 ? 'bg-red-500' : 'bg-brand-500'}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Metrics */}
          {metrics && (
            <div>
              <h3 className="section-title">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Impressions',  value: (metrics.impressions / 1000).toFixed(0) + 'k' },
                  { label: 'Clicks',       value: metrics.clicks?.toLocaleString() },
                  { label: 'Conversions',  value: metrics.conversions?.toLocaleString() },
                  { label: 'Revenue',      value: formatCurrency(metrics.revenue) },
                ].map(m => (
                  <div key={m.label} className="card bg-surface text-center">
                    <div className="text-lg font-bold text-white">{m.value}</div>
                    <div className="text-xs text-stone-400">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talent */}
          {c.talents && c.talents.length > 0 && (
            <div>
              <h3 className="section-title">Talent ({c.talents.length})</h3>
              <div className="flex flex-wrap gap-2">
                {c.talents.map(({ talent }) => (
                  <div key={talent.id}
                    className="flex items-center gap-2 bg-surface border border-surface-border rounded-lg px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400">
                      {talent.name.charAt(0)}
                    </div>
                    <span className="text-sm text-stone-200">{talent.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
