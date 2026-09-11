'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { Search, Plus, Handshake, ExternalLink, Globe } from 'lucide-react'
import { formatCurrency, CLIENT_STATUS_COLORS } from '@/lib/utils'
import AddClientModal from '@/components/clients/AddClientModal'

const STATUSES = ['', 'PROSPECT', 'ACTIVE', 'INACTIVE']

interface ClientRow {
  id: string
  name: string
  contactName?: string | null
  contactEmail?: string | null
  website?: string | null
  industry?: string | null
  status: string
  dealCount: number
  activeDeals: number
  dealValue: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (status) p.set('status', status)
    fetch(`/api/clients?${p}`).then(r => r.json()).then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { load() }, [search, status])

  return (
    <>
      <Topbar title="Clients" subtitle={`${clients.length} brand/sponsor client${clients.length !== 1 ? 's' : ''}`} />

      <div className="p-6 space-y-5 max-w-[1400px]">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-1 min-w-0 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                className="input pl-9"
                placeholder="Search name, contact, industry…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No clients found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clients.map(c => <ClientCard key={c.id} client={c} />)}
          </div>
        )}
      </div>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load() }} />}
    </>
  )
}

function ClientCard({ client: c }: { client: ClientRow }) {
  return (
    <Link href={`/clients/${c.id}`} className="card hover:border-brand-600/40 transition-colors group block">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-brand-600/20 flex items-center justify-center text-lg font-bold text-brand-400 flex-shrink-0">
            {c.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{c.name}</div>
            <div className="text-xs text-stone-400 truncate">{c.industry || 'No industry set'}</div>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      <span className={`badge ${CLIENT_STATUS_COLORS[c.status]}`}>{c.status}</span>

      {c.contactName && (
        <p className="text-xs text-stone-400 mt-3">{c.contactName}{c.contactEmail ? ` · ${c.contactEmail}` : ''}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-surface rounded-lg px-3 py-2 text-center">
          <div className="text-sm font-semibold text-emerald-400">{formatCurrency(c.dealValue)}</div>
          <div className="text-xs text-stone-500">Deal Value</div>
        </div>
        <div className="bg-surface rounded-lg px-3 py-2 text-center">
          <div className="text-sm font-semibold text-white">{c.dealCount}</div>
          <div className="text-xs text-stone-500">{c.activeDeals} active</div>
        </div>
      </div>

      {c.website && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-border text-xs text-stone-400 truncate">
          <Globe className="w-3.5 h-3.5 flex-shrink-0" /> {c.website}
        </div>
      )}
    </Link>
  )
}
