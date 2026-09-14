'use client'

import { useEffect, useState } from 'react'
import { Save, CheckCircle2, AlertCircle } from 'lucide-react'
import MediaGallery from '@/components/media/MediaGallery'

/** Fields a member may edit, by account type. Mirrors the API's allow-list. */
const FIELDS: Record<string, { key: string; label: string; type?: string; full?: boolean }[]> = {
  TALENT: [
    { key: 'name',        label: 'Full name' },
    { key: 'stageName',   label: 'Stage name' },
    { key: 'phone',       label: 'Phone' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'tags',        label: 'Tags', full: true },
    { key: 'bio',         label: 'About you', type: 'textarea', full: true },
  ],
  SUPPLIER: [
    { key: 'name',         label: 'Business name' },
    { key: 'contactName',  label: 'Contact name' },
    { key: 'contactPhone', label: 'Phone' },
    { key: 'website',      label: 'Website' },
    { key: 'city',         label: 'City' },
    { key: 'country',      label: 'Country' },
    { key: 'dayRate',      label: 'Day rate', type: 'number' },
  ],
}

export default function PortalPage() {
  const [accountType, setAccountType] = useState<'TALENT' | 'SUPPLIER' | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [form,    setForm]    = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/portal/me')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Could not load your profile'))))
      .then(d => {
        setAccountType(d.accountType)
        setProfile(d.profile)
        setForm(d.profile ?? {})
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fields = FIELDS[accountType ?? 'TALENT']
    const payload: Record<string, any> = {}
    for (const f of fields) {
      let v = form[f.key]
      if (f.type === 'number') v = v === '' || v == null ? null : Number(v)
      payload[f.key] = v ?? ''
    }
    const res = await fetch('/api/portal/me', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Could not save your changes'); setSaving(false); return }
    setProfile(json.profile)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 4000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-6 h-6 mx-auto mb-3 text-stone-600" />
        <p className="text-sm text-stone-400">{error || 'We could not find your account.'}</p>
        <p className="text-xs text-stone-600 mt-1">Contact the agency if you think this is wrong.</p>
      </div>
    )
  }

  const fields = FIELDS[accountType ?? 'TALENT']
  const isTalent = accountType === 'TALENT'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-50 tracking-tight">Your account</h1>
        <p className="text-sm text-stone-500 mt-1">
          {isTalent
            ? 'Keep your details and portfolio current — this is what the agency and clients see.'
            : 'Keep your business details and sample work current — this is what models see.'}
        </p>
      </div>

      <form onSubmit={save} className="card">
        <h2 className="section-title">Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
              <label htmlFor={`f-${f.key}`} className="block text-xs text-stone-400 mb-1.5">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  id={`f-${f.key}`} rows={4} className="input resize-none"
                  value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                />
              ) : (
                <input
                  id={`f-${f.key}`} type={f.type ?? 'text'} className="input"
                  value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Read-only: these are the agency's to set, not the member's. */}
        <div className="mt-5 pt-4 border-t border-surface-border grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-stone-500 uppercase tracking-widest">Email</div>
            <div className="text-sm text-stone-300 mt-0.5">{profile.email ?? profile.contactEmail ?? '—'}</div>
            <div className="text-[11px] text-stone-600 mt-1">
              This is how you sign in. Contact the agency to change it.
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-500 uppercase tracking-widest">Status</div>
            <div className="text-sm text-stone-300 mt-0.5">{profile.status}</div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5 mt-4">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </form>

      {/* The server derives whose media this is from the session — no id in the URL. */}
      <MediaGallery
        apiBase="/api/portal/media"
        canEdit
        title={isTalent ? 'Your portfolio' : 'Your sample work'}
        emptyLabel={isTalent
          ? 'No photos or videos yet. Add some so the agency can put you forward.'
          : 'No samples yet. Add some so models can see your work.'}
      />
    </div>
  )
}
