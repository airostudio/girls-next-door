'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props { onClose: () => void; onSuccess: () => void }

export default function AddClientModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '', contactName: '', contactEmail: '', contactPhone: '',
    website: '', industry: '', status: 'PROSPECT', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) onSuccess()
    else { const d = await res.json(); setError(d.error ?? 'Something went wrong'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white">Add New Client</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Client / Brand Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Contact Name</label>
              <input className="input" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Industry</label>
              <input className="input" value={form.industry} onChange={e => set('industry', e.target.value)}
                placeholder="e.g. Beauty, Fitness, Fashion" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Contact Email</label>
              <input className="input" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Contact Phone</label>
              <input className="input" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Website</label>
              <input className="input" value={form.website} onChange={e => set('website', e.target.value)}
                placeholder="https://…" />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="PROSPECT">Prospect</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Notes</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
