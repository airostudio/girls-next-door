'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props { onClose: () => void; onSuccess: () => void }

export default function AddTalentModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '', stageName: '', email: '', phone: '', nationality: '',
    bio: '', tier: 'STANDARD', status: 'ACTIVE', agencyFee: 20,
    tags: '', onlyfans: '', instagram: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const platformLinks = JSON.stringify({
      ...(form.onlyfans  ? { onlyfans:  form.onlyfans  } : {}),
      ...(form.instagram ? { instagram: form.instagram } : {}),
    })
    const res = await fetch('/api/talent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:         form.name,
        stageName:    form.stageName  || undefined,
        email:        form.email,
        phone:        form.phone      || undefined,
        nationality:  form.nationality || undefined,
        bio:          form.bio        || undefined,
        tier:         form.tier,
        status:       form.status,
        agencyFee:    Number(form.agencyFee),
        tags:         form.tags       || undefined,
        platformLinks: platformLinks !== '{}' ? platformLinks : undefined,
      }),
    })
    if (res.ok) { onSuccess() }
    else { const d = await res.json(); setError(d.error ?? 'Something went wrong'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white">Add New Talent</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Full Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Stage Name</label>
              <input className="input" value={form.stageName} onChange={e => set('stageName', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Phone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Nationality</label>
              <input className="input" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Agency Fee (%)</label>
              <input className="input" type="number" min="0" max="50" value={form.agencyFee}
                onChange={e => set('agencyFee', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Tier</label>
              <select className="input" value={form.tier} onChange={e => set('tier', e.target.value)}>
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
                <option value="ELITE">Elite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Bio</label>
            <textarea className="input resize-none" rows={3} value={form.bio}
              onChange={e => set('bio', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">OnlyFans URL</label>
              <input className="input" value={form.onlyfans} onChange={e => set('onlyfans', e.target.value)}
                placeholder="https://onlyfans.com/…" />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Instagram URL</label>
              <input className="input" value={form.instagram} onChange={e => set('instagram', e.target.value)}
                placeholder="https://instagram.com/…" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Tags (comma-separated)</label>
            <input className="input" value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="fitness, lifestyle, fashion" />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Talent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
