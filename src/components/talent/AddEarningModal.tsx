'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props { talentId: string; onClose: () => void; onSuccess: () => void }

export default function AddEarningModal({ talentId, onClose, onSuccess }: Props) {
  const now = new Date()
  const [form, setForm] = useState({
    platform: 'OnlyFans', amount: '', month: now.getMonth() + 1, year: now.getFullYear(), description: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/earnings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, talentId, amount: parseFloat(form.amount), month: +form.month, year: +form.year }),
    })
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-base font-semibold text-white">Add Earning</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400 hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Platform</label>
            <select className="input" value={form.platform} onChange={e => set('platform', e.target.value)}>
              {['OnlyFans', 'Instagram', 'TikTok', 'YouTube', 'Brand Deal', 'Other'].map(p =>
                <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Amount (USD)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.amount}
              onChange={e => set('amount', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Month</label>
              <select className="input" value={form.month} onChange={e => set('month', e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Year</label>
              <input className="input" type="number" value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Description</label>
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Monthly subscription revenue" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Add Earning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
