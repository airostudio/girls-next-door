'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import {
  DollarSign, TrendingUp, TrendingDown, Building2,
  Plus, Download, ChevronDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { formatCurrency, formatDate, TIER_COLORS } from '@/lib/utils'

const YEARS  = [2024, 2025, 2026]
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Tab = 'overview' | 'talent' | 'transactions'

export default function AccountingPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [year,    setYear]    = useState(new Date().getFullYear())
  const [month,   setMonth]   = useState('')
  const [tab,     setTab]     = useState<Tab>('overview')

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams({ year: String(year) })
    if (month) p.set('month', month)
    fetch(`/api/accounting?${p}`).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }

  useEffect(() => { load() }, [year, month])

  return (
    <>
      <Topbar title="Accounting" subtitle="Financial overview and reporting" />

      <div className="p-6 space-y-5 max-w-[1400px]">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <select className="input w-auto" value={year} onChange={e => setYear(+e.target.value)}>
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
            <select className="input w-auto" value={month} onChange={e => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i || ''}>{m || 'All Months'}</option>)}
            </select>
          </div>
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? null : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Gross Revenue',  value: formatCurrency(data.summary.totalRevenue),  icon: DollarSign,   color: 'text-emerald-400 bg-emerald-400/10' },
                { label: 'Agency Revenue', value: formatCurrency(data.summary.agencyRevenue), icon: Building2,    color: 'text-blue-400 bg-blue-400/10' },
                { label: 'Total Expenses', value: formatCurrency(data.summary.totalExpenses), icon: TrendingDown, color: 'text-red-400 bg-red-400/10' },
                { label: 'Net Revenue',    value: formatCurrency(data.summary.netRevenue),    icon: TrendingUp,   color: 'text-purple-400 bg-purple-400/10' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="stat-card">
                  <div className={`stat-icon ${color}`}><Icon className="w-5 h-5" /></div>
                  <div>
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-surface-border flex gap-1">
              {(['overview', 'talent', 'transactions'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    tab === t ? 'text-white border-brand-500' : 'text-stone-400 border-transparent hover:text-stone-200'
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="card">
                <h3 className="section-title">Monthly Revenue vs Expenses ({year})</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthly} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#161b26', border: '1px solid #1e2535', borderRadius: 8 }}
                      formatter={(v: any) => [formatCurrency(v as number)]}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                    <Bar dataKey="earnings" name="Revenue" fill="#3b5bfd" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Talent Breakdown Tab */}
            {tab === 'talent' && (
              <div className="card overflow-x-auto">
                <h3 className="section-title">Revenue by Talent</h3>
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-left border-b border-surface-border">
                      <th className="table-header">Talent</th>
                      <th className="table-header">Tier</th>
                      <th className="table-header">Gross Revenue</th>
                      <th className="table-header">Expenses</th>
                      <th className="table-header">Agency Fee</th>
                      <th className="table-header">Agency Revenue</th>
                      <th className="table-header">Talent Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.talentSummary.map((t: any) => {
                      const talentNet = t.grossEarnings - t.expenses - t.agencyRevenue
                      return (
                        <tr key={t.id} className="table-row">
                          <td className="table-cell">
                            <div className="font-medium text-white">{t.name}</div>
                            {t.stageName && <div className="text-xs text-stone-400">{t.stageName}</div>}
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${TIER_COLORS[t.tier]}`}>{t.tier}</span>
                          </td>
                          <td className="table-cell font-semibold text-emerald-400">{formatCurrency(t.grossEarnings)}</td>
                          <td className="table-cell text-red-400">{formatCurrency(t.expenses)}</td>
                          <td className="table-cell text-stone-400">{t.agencyFee}%</td>
                          <td className="table-cell font-semibold text-blue-400">{formatCurrency(t.agencyRevenue)}</td>
                          <td className={`table-cell font-semibold ${talentNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(talentNet)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-surface-border">
                    <tr>
                      <td colSpan={2} className="table-cell font-bold text-white">Totals</td>
                      <td className="table-cell font-bold text-emerald-400">{formatCurrency(data.summary.totalRevenue)}</td>
                      <td className="table-cell font-bold text-red-400">{formatCurrency(data.summary.totalExpenses)}</td>
                      <td className="table-cell text-stone-400">—</td>
                      <td className="table-cell font-bold text-blue-400">{formatCurrency(data.summary.agencyRevenue)}</td>
                      <td className="table-cell font-bold text-purple-400">{formatCurrency(data.summary.netRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Transactions Tab */}
            {tab === 'transactions' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="card">
                  <h3 className="section-title text-emerald-400 mb-4">Recent Earnings</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="table-header">Talent</th>
                          <th className="table-header">Platform</th>
                          <th className="table-header">Period</th>
                          <th className="table-header">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentEarnings.map((e: any) => (
                          <tr key={e.id} className="table-row">
                            <td className="table-cell text-sm text-stone-300">{e.talent.name}</td>
                            <td className="table-cell">
                              <span className="badge text-blue-400 bg-blue-400/10 border-blue-400/20 text-xs">{e.platform}</span>
                            </td>
                            <td className="table-cell text-xs text-stone-400">{e.month}/{e.year}</td>
                            <td className="table-cell font-semibold text-emerald-400 text-sm">{formatCurrency(e.amount)}</td>
                          </tr>
                        ))}
                        {data.recentEarnings.length === 0 && (
                          <tr><td colSpan={4} className="table-cell text-center text-stone-500 py-6">No earnings this period</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expenses */}
                <div className="card">
                  <h3 className="section-title text-red-400 mb-4">Recent Expenses</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="table-header">Talent</th>
                          <th className="table-header">Category</th>
                          <th className="table-header">Date</th>
                          <th className="table-header">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentExpenses.map((e: any) => (
                          <tr key={e.id} className="table-row">
                            <td className="table-cell text-sm text-stone-300">{e.talent.name}</td>
                            <td className="table-cell">
                              <span className="badge text-amber-400 bg-amber-400/10 border-amber-400/20 text-xs">{e.category}</span>
                            </td>
                            <td className="table-cell text-xs text-stone-400">{formatDate(e.date)}</td>
                            <td className="table-cell font-semibold text-red-400 text-sm">{formatCurrency(e.amount)}</td>
                          </tr>
                        ))}
                        {data.recentExpenses.length === 0 && (
                          <tr><td colSpan={4} className="table-cell text-center text-stone-500 py-6">No expenses this period</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
