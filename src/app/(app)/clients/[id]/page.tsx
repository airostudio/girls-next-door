'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import {
  ArrowLeft, Mail, Phone, Globe, Trash2, Plus, Building2,
} from 'lucide-react'
import { formatCurrency, formatDate, CLIENT_STATUS_COLORS, DEAL_STATUS_COLORS } from '@/lib/utils'
import AddDealModal from '@/components/clients/AddDealModal'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [client,   setClient]   = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [showDeal, setShowDeal] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/clients/${id}`).then(r => {
      if (!r.ok) { router.push('/clients'); return }
      return r.json()
    }).then(d => { if (d) { setClient(d); setLoading(false) } })
  }

  useEffect(() => { load() }, [id])

  if (loading || !client) {
    return (
      <>
        <Topbar title="Client Profile" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  const deals = (client.deals as any[]) ?? []
  const totalValue  = deals.reduce((s, d) => s + (d.value ?? 0), 0)
  const activeValue = deals.filter(d => d.status === 'ACTIVE').reduce((s, d) => s + (d.value ?? 0), 0)

  async function handleDelete() {
    if (!confirm('Delete this client? This also removes their deal history.')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    router.push('/clients')
  }

  return (
    <>
      <Topbar title={client.name} subtitle={client.industry ?? undefined} />

      <div className="p-6 space-y-5 max-w-[1100px]">
        <Link href="/clients" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>

        <div className="card">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center text-2xl font-bold text-brand-400 flex-shrink-0">
                {client.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{client.name}</h2>
                  <span className={`badge ${CLIENT_STATUS_COLORS[client.status]}`}>{client.status}</span>
                </div>
                <div className="text-stone-400 mt-0.5 text-sm">{client.contactName || 'No contact set'}</div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {client.contactEmail && (
                    <a href={`mailto:${client.contactEmail}`} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white">
                      <Mail className="w-3.5 h-3.5" /> {client.contactEmail}
                    </a>
                  )}
                  {client.contactPhone && (
                    <span className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Phone className="w-3.5 h-3.5" /> {client.contactPhone}
                    </span>
                  )}
                  {client.website && (
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white">
                      <Globe className="w-3.5 h-3.5" /> {client.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <button onClick={handleDelete} className="btn-danger flex items-center gap-1.5 text-xs">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {client.notes && (
            <p className="text-sm text-stone-300 mt-4 leading-relaxed border-t border-surface-border pt-4">{client.notes}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Deal Value',  value: formatCurrency(totalValue),  color: 'text-emerald-400' },
            { label: 'Active Deal Value', value: formatCurrency(activeValue), color: 'text-blue-400' },
            { label: 'Total Deals',       value: String(deals.length),        color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-stone-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-400" /> Deals
            </h3>
            <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={() => setShowDeal(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Deal
            </button>
          </div>

          <div className="space-y-2">
            {deals.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm">{d.title}</div>
                  <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                    {d.talent && <span>{d.talent.name}</span>}
                    {d.startDate && <span>{formatDate(d.startDate)}{d.endDate ? ` → ${formatDate(d.endDate)}` : ''}</span>}
                  </div>
                </div>
                {d.value != null && (
                  <div className="text-sm font-semibold text-emerald-400">{formatCurrency(d.value)}</div>
                )}
                <span className={`badge ${DEAL_STATUS_COLORS[d.status]}`}>{d.status}</span>
              </div>
            ))}
            {deals.length === 0 && (
              <p className="text-center text-stone-500 py-8">No deals recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {showDeal && (
        <AddDealModal clientId={id} onClose={() => setShowDeal(false)} onSuccess={() => { setShowDeal(false); load() }} />
      )}
    </>
  )
}
