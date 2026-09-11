'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import {
  Search, Plus, Filter, Users, Star,
  Mail, Phone, ExternalLink, MoreVertical,
} from 'lucide-react'
import { formatCurrency, TIER_COLORS, STATUS_COLORS } from '@/lib/utils'
import type { Talent } from '@/types'
import AddTalentModal from '@/components/talent/AddTalentModal'

const TIERS   = ['', 'STANDARD', 'PREMIUM', 'ELITE']
const STATUSES = ['', 'ACTIVE', 'PENDING', 'INACTIVE']

export default function TalentPage() {
  const [talents,  setTalents]  = useState<Talent[]>([])
  const [search,   setSearch]   = useState('')
  const [tier,     setTier]     = useState('')
  const [status,   setStatus]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [view,     setView]     = useState<'grid' | 'table'>('grid')

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (tier)   p.set('tier',   tier)
    if (status) p.set('status', status)
    fetch(`/api/talent?${p}`).then(r => r.json()).then(d => { setTalents(d); setLoading(false) })
  }

  useEffect(() => { load() }, [search, tier, status])

  return (
    <>
      <Topbar title="Talent Pool" subtitle={`${talents.length} talent${talents.length !== 1 ? 's' : ''} on roster`} />

      <div className="p-6 space-y-5 max-w-[1400px]">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-1 min-w-0 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                className="input pl-9"
                placeholder="Search name, stage name, tags…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="input w-auto" value={tier}   onChange={e => setTier(e.target.value)}>
              {TIERS.map(t => <option key={t} value={t}>{t || 'All Tiers'}</option>)}
            </select>
            <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Talent
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : talents.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No talent found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {talents.map(t => <TalentCard key={t.id} talent={t} onRefresh={load} />)}
          </div>
        )}
      </div>

      {showAdd && <AddTalentModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load() }} />}
    </>
  )
}

function TalentCard({ talent: t, onRefresh }: { talent: Talent; onRefresh: () => void }) {
  const links = t.platformLinks ? JSON.parse(t.platformLinks) : {}

  return (
    <div className="card hover:border-brand-600/40 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-brand-600/20 flex items-center justify-center text-lg font-bold text-brand-400 flex-shrink-0">
            {t.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{t.name}</div>
            <div className="text-xs text-stone-400 truncate">{t.stageName || 'No stage name'}</div>
          </div>
        </div>
        <Link href={`/talent/${t.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-stone-400 hover:text-white" />
        </Link>
      </div>

      {/* Badges */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <span className={`badge ${TIER_COLORS[t.tier]}`}>{t.tier}</span>
        <span className={`badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
      </div>

      {/* Bio */}
      {t.bio && (
        <p className="text-xs text-stone-400 mb-3 line-clamp-2 leading-relaxed">{t.bio}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-surface rounded-lg px-3 py-2 text-center">
          <div className="text-sm font-semibold text-emerald-400">{formatCurrency(t.totalEarnings ?? 0)}</div>
          <div className="text-xs text-stone-500">Total Earned</div>
        </div>
        <div className="bg-surface rounded-lg px-3 py-2 text-center">
          <div className="text-sm font-semibold text-white">{t._count?.campaigns ?? 0}</div>
          <div className="text-xs text-stone-500">Campaigns</div>
        </div>
      </div>

      {/* Tags */}
      {t.tags && (
        <div className="flex flex-wrap gap-1 mb-3">
          {t.tags.split(',').slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-surface px-2 py-0.5 rounded text-stone-400">{tag.trim()}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-surface-border">
        <Link href={`/talent/${t.id}`} className="btn-secondary text-xs flex-1 text-center py-1.5">
          View Profile
        </Link>
        {links.onlyfans && (
          <a href={links.onlyfans} target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5 px-2">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}
