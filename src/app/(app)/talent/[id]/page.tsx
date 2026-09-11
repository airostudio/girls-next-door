'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import {
  ArrowLeft, Mail, Phone, Globe, ExternalLink,
  Trash2, Plus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatDate, TIER_COLORS, STATUS_COLORS, CAMPAIGN_STATUS_COLORS } from '@/lib/utils'
import AddEarningModal from '@/components/talent/AddEarningModal'
import AddExpenseModal from '@/components/talent/AddExpenseModal'

export default function TalentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [talent,     setTalent]     = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<'overview' | 'earnings' | 'expenses' | 'campaigns' | 'notes'>('overview')
  const [showEarn,   setShowEarn]   = useState(false)
  const [showExp,    setShowExp]    = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/talent/${id}`).then(r => {
      if (!r.ok) { router.push('/talent'); return }
      return r.json()
    }).then(d => { if (d) { setTalent(d); setLoading(false) } })
  }

  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <>
        <Topbar title="Talent Profile" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  if (!talent) return null

  const links    = talent.platformLinks ? JSON.parse(talent.platformLinks) : {}
  const social   = talent.socialLinks   ? JSON.parse(talent.socialLinks)   : {}
  const totalEarned  = (talent.earnings as any[]).reduce((s: number, e: any) => s + e.amount, 0)
  const totalExpenses = (talent.expenses as any[]).reduce((s: number, e: any) => s + e.amount, 0)
  const netRevenue    = totalEarned - totalExpenses
  const agencyRevenue = totalEarned * (talent.agencyFee / 100)

  // Monthly earnings chart
  const monthMap: Record<string, number> = {}
  for (const e of talent.earnings as any[]) {
    const key = `${e.month}/${e.year}`
    monthMap[key] = (monthMap[key] ?? 0) + e.amount
  }
  const chartData = Object.entries(monthMap).slice(0, 6).map(([label, revenue]) => ({ label, revenue }))

  async function handleDelete() {
    if (!confirm('Delete this talent? This cannot be undone.')) return
    await fetch(`/api/talent/${id}`, { method: 'DELETE' })
    router.push('/talent')
  }

  const TABS = ['overview', 'earnings', 'expenses', 'campaigns', 'notes'] as const

  return (
    <>
      <Topbar title={talent.name} subtitle={talent.stageName ?? undefined} />

      <div className="p-6 space-y-5 max-w-[1200px]">
        {/* Back */}
        <Link href="/talent" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Talent Pool
        </Link>

        {/* Hero */}
        <div className="card">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center text-2xl font-bold text-brand-400 flex-shrink-0">
                {talent.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{talent.name}</h2>
                  <span className={`badge ${TIER_COLORS[talent.tier]}`}>{talent.tier}</span>
                  <span className={`badge ${STATUS_COLORS[talent.status]}`}>{talent.status}</span>
                </div>
                <div className="text-stone-400 mt-0.5 text-sm">{talent.stageName || 'No stage name'}</div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {talent.email && (
                    <a href={`mailto:${talent.email}`} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white">
                      <Mail className="w-3.5 h-3.5" /> {talent.email}
                    </a>
                  )}
                  {talent.phone && (
                    <span className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Phone className="w-3.5 h-3.5" /> {talent.phone}
                    </span>
                  )}
                  {talent.nationality && (
                    <span className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Globe className="w-3.5 h-3.5" /> {talent.nationality}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {links.onlyfans && (
                <a href={links.onlyfans} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" /> OnlyFans
                </a>
              )}
              {links.instagram && (
                <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" /> Instagram
                </a>
              )}
              <button onClick={handleDelete} className="btn-danger flex items-center gap-1.5 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {talent.bio && (
            <p className="text-sm text-stone-300 mt-4 leading-relaxed border-t border-surface-border pt-4">{talent.bio}</p>
          )}

          {talent.tags && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {talent.tags.split(',').map((tag: string) => (
                <span key={tag} className="text-xs bg-surface border border-surface-border px-2 py-0.5 rounded text-stone-400">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Earned',    value: formatCurrency(totalEarned),    color: 'text-emerald-400 bg-emerald-400/10' },
            { label: 'Agency Revenue',  value: formatCurrency(agencyRevenue),  color: 'text-purple-400 bg-purple-400/10'  },
            { label: 'Total Expenses',  value: formatCurrency(totalExpenses),  color: 'text-red-400 bg-red-400/10'        },
            { label: 'Net Revenue',     value: formatCurrency(netRevenue),     color: 'text-blue-400 bg-blue-400/10'      },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className={`text-xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</div>
              <div className="text-xs text-stone-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-border flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'text-white border-brand-500'
                  : 'text-stone-400 border-transparent hover:text-stone-200'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="section-title">Earnings Chart</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#161b26', border: '1px solid #1e2535', borderRadius: 8 }}
                    formatter={(v: any) => [formatCurrency(v), 'Earnings']} />
                  <Bar dataKey="revenue" fill="#3b5bfd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="section-title">Contract Details</h3>
              <dl className="space-y-3">
                {[
                  { label: 'Joined',       value: formatDate(talent.joinedAt) },
                  { label: 'Contract End', value: talent.contractEnd ? formatDate(talent.contractEnd) : 'Rolling' },
                  { label: 'Agency Fee',   value: `${talent.agencyFee}%` },
                  { label: 'Campaigns',    value: `${talent.campaigns.length} total` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <dt className="text-stone-400">{label}</dt>
                    <dd className="font-medium text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {tab === 'earnings' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Earnings History</h3>
              <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={() => setShowEarn(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Earning
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="table-header">Period</th>
                  <th className="table-header">Platform</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Description</th>
                </tr>
              </thead>
              <tbody>
                {(talent.earnings as any[]).map((e: any) => (
                  <tr key={e.id} className="table-row">
                    <td className="table-cell text-stone-300">{e.month}/{e.year}</td>
                    <td className="table-cell">
                      <span className="badge text-blue-400 bg-blue-400/10 border-blue-400/20">{e.platform}</span>
                    </td>
                    <td className="table-cell font-semibold text-emerald-400">{formatCurrency(e.amount)}</td>
                    <td className="table-cell text-stone-400 text-xs">{e.description || '—'}</td>
                  </tr>
                ))}
                {talent.earnings.length === 0 && (
                  <tr><td colSpan={4} className="table-cell text-center text-stone-500 py-8">No earnings recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Expenses Tab */}
        {tab === 'expenses' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Expenses</h3>
              <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={() => setShowExp(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Expense
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="table-header">Date</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Description</th>
                </tr>
              </thead>
              <tbody>
                {(talent.expenses as any[]).map((e: any) => (
                  <tr key={e.id} className="table-row">
                    <td className="table-cell text-stone-300">{formatDate(e.date)}</td>
                    <td className="table-cell">
                      <span className="badge text-amber-400 bg-amber-400/10 border-amber-400/20">{e.category}</span>
                    </td>
                    <td className="table-cell font-semibold text-red-400">{formatCurrency(e.amount)}</td>
                    <td className="table-cell text-stone-400 text-xs">{e.description || '—'}</td>
                  </tr>
                ))}
                {talent.expenses.length === 0 && (
                  <tr><td colSpan={4} className="table-cell text-center text-stone-500 py-8">No expenses recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Campaigns Tab */}
        {tab === 'campaigns' && (
          <div className="card">
            <h3 className="section-title">Campaign Participation</h3>
            <div className="space-y-2">
              {(talent.campaigns as any[]).map((ct: any) => (
                <div key={ct.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <div>
                    <div className="font-medium text-white text-sm">{ct.campaign.title}</div>
                    <div className="text-xs text-stone-400">{ct.campaign.type}</div>
                  </div>
                  <span className={`badge ${CAMPAIGN_STATUS_COLORS[ct.campaign.status]}`}>{ct.campaign.status}</span>
                </div>
              ))}
              {talent.campaigns.length === 0 && (
                <p className="text-center text-stone-500 py-8">No campaign participation</p>
              )}
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {tab === 'notes' && (
          <div className="card">
            <h3 className="section-title">Notes</h3>
            <div className="space-y-3">
              {(talent.notes as any[]).map((n: any) => (
                <div key={n.id} className="bg-surface rounded-lg p-3">
                  <p className="text-sm text-stone-200">{n.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
                    <span>{n.author}</span>
                    <span>·</span>
                    <span>{formatDate(n.createdAt)}</span>
                  </div>
                </div>
              ))}
              {talent.notes.length === 0 && (
                <p className="text-center text-stone-500 py-8">No notes yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {showEarn && (
        <AddEarningModal talentId={id} onClose={() => setShowEarn(false)} onSuccess={() => { setShowEarn(false); load() }} />
      )}
      {showExp && (
        <AddExpenseModal talentId={id} onClose={() => setShowExp(false)} onSuccess={() => { setShowExp(false); load() }} />
      )}
    </>
  )
}
