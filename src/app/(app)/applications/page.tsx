'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Topbar from '@/components/layout/Topbar'
import { Inbox, Mail, Phone, Globe, MapPin, Check, X, Clock, Copy } from 'lucide-react'
import { hasRole, type Role } from '@/lib/rbac'
import { formatDate } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'text-amber-400 bg-amber-400/10 border-amber-400/30',
  REVIEWING: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  APPROVED:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  REJECTED:  'text-stone-500 bg-stone-500/10 border-stone-500/30',
}

const EXPERIENCE_LABELS: Record<string, string> = {
  NONE: 'Just starting out', SOME: 'Some experience',
  EXPERIENCED: 'Experienced', PROFESSIONAL: 'Working professionally',
}

export default function ApplicationsPage() {
  const { data: session } = useSession()
  const canReview = hasRole((session?.user as any)?.role as Role | undefined, 'MANAGER')

  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'OPEN' | 'ALL'>('OPEN')
  const [openId,  setOpenId]  = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/applications')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function setStatus(id: string, status: string) {
    await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  function copyJoinLink() {
    navigator.clipboard?.writeText(new URL('/join', window.location.origin).toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const shown = filter === 'OPEN'
    ? items.filter(a => a.status === 'PENDING' || a.status === 'REVIEWING')
    : items
  const openCount = items.filter(a => a.status === 'PENDING' || a.status === 'REVIEWING').length

  return (
    <>
      <Topbar title="Applications" subtitle="People who applied through the public join link" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1">
            {(['OPEN', 'ALL'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25'
                               : 'text-stone-400 hover:text-stone-200 border border-transparent'
                }`}
              >
                {f === 'OPEN' ? `Open (${openCount})` : `All (${items.length})`}
              </button>
            ))}
          </div>

          <button onClick={copyJoinLink} className="btn-secondary flex items-center gap-2 text-xs">
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Link copied' : 'Copy join link'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="card text-center py-12">
            <Inbox className="w-6 h-6 mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400">
              {filter === 'OPEN' ? 'No applications waiting on you.' : 'No applications yet.'}
            </p>
            <p className="text-xs text-stone-600 mt-1">
              Share the join link and submissions will land here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(a => {
              const open = openId === a.id
              return (
                <div key={a.id} className="card p-0 overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-stone-50 text-sm">{a.fullName}</span>
                        <span className="badge text-brand-300 bg-brand-500/10 border-brand-500/25">{a.kind}</span>
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-3 flex-wrap mt-1">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</span>
                        {(a.city || a.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{[a.city, a.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(a.createdAt)}</span>
                      </div>
                    </div>

                    <span className={`badge ${STATUS_STYLES[a.status] ?? ''}`}>{a.status}</span>

                    <button onClick={() => setOpenId(open ? null : a.id)} className="btn-secondary text-xs py-1.5">
                      {open ? 'Hide' : 'View'}
                    </button>
                  </div>

                  {open && (
                    <div className="border-t border-surface-border p-4 space-y-4 bg-surface/40">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {[
                          ['Phone',        a.phone],
                          ['Business',     a.businessName],
                          ['ABN / Tax ID', a.taxId],
                          ['Instagram',    a.instagram],
                          ['Experience',   a.experience ? EXPERIENCE_LABELS[a.experience] ?? a.experience : null],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label as string}>
                            <dt className="text-[11px] text-stone-500 uppercase tracking-widest">{label}</dt>
                            <dd className="text-stone-200 mt-0.5">{value as string}</dd>
                          </div>
                        ))}
                        {a.website && (
                          <div>
                            <dt className="text-[11px] text-stone-500 uppercase tracking-widest">Website</dt>
                            <dd className="mt-0.5">
                              <a href={a.website} target="_blank" rel="noopener noreferrer"
                                 className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">
                                <Globe className="w-3 h-3" />{a.website}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>

                      {a.about && (
                        <div>
                          <p className="text-[11px] text-stone-500 uppercase tracking-widest mb-1">About</p>
                          <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">{a.about}</p>
                        </div>
                      )}

                      {canReview && (
                        <div className="flex gap-2 flex-wrap pt-1">
                          {a.status !== 'APPROVED' && (
                            <button onClick={() => setStatus(a.id, 'APPROVED')} className="btn-primary text-xs py-1.5 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {a.status !== 'REVIEWING' && a.status !== 'APPROVED' && (
                            <button onClick={() => setStatus(a.id, 'REVIEWING')} className="btn-secondary text-xs py-1.5">
                              Mark reviewing
                            </button>
                          )}
                          {a.status !== 'REJECTED' && (
                            <button onClick={() => setStatus(a.id, 'REJECTED')} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
                              <X className="w-3.5 h-3.5" /> Decline
                            </button>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-stone-600 leading-relaxed pt-1 border-t border-surface-border/60">
                        Approving records a decision. It does not create a login or a roster entry —
                        add them under Talent or Suppliers when you&apos;re ready.
                      </p>

                      {a.reviewedBy && (
                        <p className="text-[11px] text-stone-600">
                          Last reviewed by {a.reviewedBy}{a.reviewedAt ? ` on ${formatDate(a.reviewedAt)}` : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
