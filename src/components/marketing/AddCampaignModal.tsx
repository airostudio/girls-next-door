'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props { onClose: () => void; onSuccess: () => void }

export default function AddCampaignModal({ onClose, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    title: '', description: '', type: 'LAUNCH', status: 'DRAFT',
    startDate: today, endDate: '', budget: '', goal: '', platform: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        endDate: form.endDate || undefined,
      }),
    })
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white">New Campaign</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400 hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Campaign Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Type</label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                {['LAUNCH', 'PROMOTION', 'COLLAB', 'SEASONAL', 'SOCIAL_PUSH'].map(t =>
                  <option key={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Start Date *</label>
              <input className="input" type="date" value={form.startDate}
                onChange={e => set('startDate', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">End Date</label>
              <input className="input" type="date" value={form.endDate}
                onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Budget (USD)</label>
              <input className="input" type="number" min="0" value={form.budget}
                onChange={e => set('budget', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Target Platform</label>
              <select className="input" value={form.platform} onChange={e => set('platform', e.target.value)}>
                {['', 'OnlyFans', 'Instagram', 'TikTok', 'YouTube', 'Multi-platform'].map(p =>
                  <option key={p} value={p}>{p || 'Select platform'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Campaign Goal</label>
            <input className="input" value={form.goal} onChange={e => set('goal', e.target.value)}
              placeholder="e.g. Grow subscriber base by 25%" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating…' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
