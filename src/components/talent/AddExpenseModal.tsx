'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props { talentId: string; onClose: () => void; onSuccess: () => void }

export default function AddExpenseModal({ talentId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    category: 'Shoot', amount: '', date: new Date().toISOString().split('T')[0], description: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, talentId, amount: parseFloat(form.amount) }),
    })
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-base font-semibold text-white">Add Expense</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400 hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Category</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {['Shoot', 'Travel', 'Equipment', 'Marketing', 'Legal', 'Other'].map(c =>
                <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Amount (USD)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.amount}
              onChange={e => set('amount', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Date</label>
            <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">Description</label>
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Professional photoshoot" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
