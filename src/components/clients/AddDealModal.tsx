'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Props { clientId: string; onClose: () => void; onSuccess: () => void }

export default function AddDealModal({ clientId, onClose, onSuccess }: Props) {
  const [talents, setTalents] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    title: '', talentId: '', status: 'PROSPECT', value: '',
    startDate: '', endDate: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/talent').then(r => r.json()).then(d => setTalents(Array.isArray(d) ? d : []))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        clientId,
        talentId: form.talentId || undefined,
        value: form.value || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }),
    })
    if (res.ok) onSuccess()
    else { const d = await res.json(); setError(d.error ?? 'Something went wrong'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-base font-semibold text-white">Add Deal</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400 hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Deal Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Talent</label>
            <select className="input" value={form.talentId} onChange={e => set('talentId', e.target.value)}>
              <option value="">Not talent-specific</option>
              {talents.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {['PROSPECT', 'NEGOTIATING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Value (USD)</label>
              <input className="input" type="number" min="0" value={form.value} onChange={e => set('value', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Start Date</label>
              <input className="input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">End Date</label>
              <input className="input" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Add Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
