'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Topbar from '@/components/layout/Topbar'
import { Camera, Plus, X, Trash2, Globe, Mail, Phone, MapPin } from 'lucide-react'
import MediaGallery from '@/components/media/MediaGallery'
import { hasRole, type Role } from '@/lib/rbac'
import { formatCurrency } from '@/lib/utils'

const KINDS = ['PHOTOGRAPHER', 'VIDEOGRAPHER', 'MUA', 'STYLIST', 'STUDIO', 'OTHER'] as const

const KIND_LABELS: Record<string, string> = {
  PHOTOGRAPHER: 'Photographer',
  VIDEOGRAPHER: 'Videographer',
  MUA:          'Make-up artist',
  STYLIST:      'Stylist',
  STUDIO:       'Studio',
  OTHER:        'Other',
}

const EMPTY = {
  name: '', kind: 'PHOTOGRAPHER', contactName: '', contactEmail: '',
  contactPhone: '', website: '', city: '', country: '', dayRate: '', notes: '',
}

export default function SuppliersPage() {
  const { data: session } = useSession()
  const canEdit = hasRole((session?.user as any)?.role as Role | undefined, 'MANAGER')

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [form,      setForm]      = useState({ ...EMPTY })
  const [error,     setError]     = useState('')
  const [openId,    setOpenId]    = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/suppliers')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setSuppliers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        dayRate: form.dayRate === '' ? null : Number(form.dayRate),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Could not save that supplier'); return }
    setShowAdd(false)
    setForm({ ...EMPTY })
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    setSuppliers(list => list.filter(s => s.id !== id))
  }

  const thumbFor = (s: any) =>
    (s.media as any[])?.find(m => m.isPrimary)?.url ?? (s.media as any[])?.[0]?.url ?? null

  return (
    <>
      <Topbar title="Suppliers" subtitle="Photographers, studios and crew the agency books" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-stone-500">
            {loading ? 'Loading…' : `${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}`}
          </p>
          {canEdit && (
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Supplier
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="card text-center py-12">
            <Camera className="w-6 h-6 mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400">No suppliers yet.</p>
            <p className="text-xs text-stone-600 mt-1">
              Add the photographers, studios and crew you book, and keep samples of their work here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suppliers.map(s => {
              const thumb = thumbFor(s)
              const open = openId === s.id
              return (
                <div key={s.id} className="card p-0 overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-lg bg-surface-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {thumb
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                        : <Camera className="w-4 h-4 text-stone-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-50 text-sm truncate">{s.name}</div>
                      <div className="text-xs text-stone-500 flex items-center gap-3 flex-wrap mt-0.5">
                        <span>{KIND_LABELS[s.kind] ?? s.kind}</span>
                        {(s.city || s.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{[s.city, s.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {s.dayRate != null && <span>{formatCurrency(s.dayRate)}/day</span>}
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 text-stone-500">
                      {s.contactEmail && (
                        <a href={`mailto:${s.contactEmail}`} title={s.contactEmail} className="hover:text-brand-400 transition-colors">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {s.contactPhone && (
                        <a href={`tel:${s.contactPhone}`} title={s.contactPhone} className="hover:text-brand-400 transition-colors">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <span className={`badge ${s.status === 'ACTIVE'
                      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                      : 'text-stone-500 bg-stone-500/10 border-stone-500/30'}`}>
                      {s.status}
                    </span>

                    <button onClick={() => setOpenId(open ? null : s.id)} className="btn-secondary text-xs py-1.5">
                      {open ? 'Hide work' : 'Work'}
                    </button>

                    {canEdit && (
                      <button onClick={() => remove(s.id)} className="text-stone-500 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {open && (
                    <div className="border-t border-surface-border p-4 bg-surface/40">
                      <MediaGallery
                        ownerType="supplier"
                        ownerId={s.id}
                        canEdit={canEdit}
                        title="Sample work"
                        emptyLabel="No samples uploaded for this supplier yet."
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <h2 className="font-display text-base font-semibold text-white">Add Supplier</h2>
              <button onClick={() => setShowAdd(false)} className="text-stone-500 hover:text-stone-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={create} className="p-5 space-y-3">
              <div>
                <label htmlFor="sup-name" className="block text-sm text-stone-400 mb-1.5">Name *</label>
                <input id="sup-name" required className="input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>

              <div>
                <label htmlFor="sup-kind" className="block text-sm text-stone-400 mb-1.5">Type</label>
                <select id="sup-kind" className="input" value={form.kind} onChange={e => set('kind', e.target.value)}>
                  {KINDS.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sup-contact" className="block text-sm text-stone-400 mb-1.5">Contact name</label>
                  <input id="sup-contact" className="input" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="sup-email" className="block text-sm text-stone-400 mb-1.5">Email</label>
                  <input id="sup-email" type="email" className="input" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="sup-phone" className="block text-sm text-stone-400 mb-1.5">Phone</label>
                  <input id="sup-phone" className="input" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="sup-site" className="block text-sm text-stone-400 mb-1.5">Website</label>
                  <input id="sup-site" className="input" placeholder="https://" value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="sup-city" className="block text-sm text-stone-400 mb-1.5">City</label>
                  <input id="sup-city" className="input" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="sup-country" className="block text-sm text-stone-400 mb-1.5">Country</label>
                  <input id="sup-country" className="input" value={form.country} onChange={e => set('country', e.target.value)} />
                </div>
              </div>

              <div>
                <label htmlFor="sup-rate" className="block text-sm text-stone-400 mb-1.5">Day rate</label>
                <input id="sup-rate" type="number" min="0" step="0.01" className="input" value={form.dayRate} onChange={e => set('dayRate', e.target.value)} />
              </div>

              <div>
                <label htmlFor="sup-notes" className="block text-sm text-stone-400 mb-1.5">Notes</label>
                <textarea id="sup-notes" rows={3} className="input resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1">Add supplier</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              </div>
              <p className="text-[11px] text-stone-600">
                Sample images can be added from the supplier&apos;s Work panel once saved.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
