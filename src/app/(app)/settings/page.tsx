'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import {
  Building2, Shield, Save, CheckCircle, Info,
  Plus, X, Trash2,
} from 'lucide-react'

type Tab = 'agency' | 'team'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('agency')

  return (
    <>
      <Topbar title="Settings" subtitle="Platform and agency configuration" />

      <div className="p-6 space-y-5 max-w-[900px]">
        <div className="border-b border-surface-border flex gap-1">
          {([
            { key: 'agency', label: 'Agency', icon: Building2 },
            { key: 'team',   label: 'Team',   icon: Shield },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key ? 'text-white border-brand-500' : 'text-stone-400 border-transparent hover:text-stone-200'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'agency' && <AgencySettings />}
        {tab === 'team'   && <TeamManagement />}
      </div>
    </>
  )
}

function AgencySettings() {
  const [form, setForm]     = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setForm(d ?? {
        agencyName: 'Clarity 4K', currency: 'USD', defaultFee: 20,
        contactEmail: '', contactPhone: '', address: '', taxId: '',
      })
    })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!form) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  return (
    <form onSubmit={save} className="card space-y-5">
      <h3 className="section-title flex items-center gap-2">
        <Building2 className="w-4 h-4 text-brand-400" /> Agency Information
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Agency Name</label>
          <input className="input" value={form.agencyName ?? ''} onChange={e => set('agencyName', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Default Currency</label>
          <select className="input" value={form.currency ?? 'USD'} onChange={e => set('currency', e.target.value)}>
            {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Default Agency Fee (%)</label>
          <input className="input" type="number" min="0" max="100" value={form.defaultFee ?? 20}
            onChange={e => set('defaultFee', +e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Tax ID / VAT Number</label>
          <input className="input" value={form.taxId ?? ''} onChange={e => set('taxId', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Contact Email</label>
          <input className="input" type="email" value={form.contactEmail ?? ''} onChange={e => set('contactEmail', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Contact Phone</label>
          <input className="input" value={form.contactPhone ?? ''} onChange={e => set('contactPhone', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-stone-400 mb-1.5">Address</label>
        <textarea className="input resize-none" rows={2} value={form.address ?? ''}
          onChange={e => set('address', e.target.value)} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle className="w-4 h-4" /> Saved
          </div>
        )}
      </div>
    </form>
  )
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  MANAGER: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  VIEWER:  'text-stone-400 bg-stone-400/10 border-stone-400/30',
}

function TeamManagement() {
  const [staff,   setStaff]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ email: '', name: '', role: 'VIEWER' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/staff').then(r => r.json()).then(d => { setStaff(Array.isArray(d) ? d : []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  async function addStaff(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowAdd(false); setForm({ email: '', name: '', role: 'VIEWER' }); load() }
    else { const d = await res.json(); setError(d.error ?? 'Something went wrong'); setSaving(false) }
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    load()
  }

  async function toggleStatus(id: string, status: string) {
    await fetch(`/api/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    })
    load()
  }

  async function removeStaff(id: string) {
    if (!confirm('Remove this team member? They will immediately lose access.')) return
    await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title flex items-center gap-2 mb-0">
            <Shield className="w-4 h-4 text-brand-400" /> Team Members
          </h3>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Team Member
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-sm font-bold text-brand-400 flex-shrink-0">
                  {(s.name || s.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">{s.name || s.email}</div>
                  <div className="text-xs text-stone-400 truncate">{s.email}</div>
                </div>
                <select
                  className="input w-auto text-xs py-1"
                  value={s.role}
                  onChange={e => updateRole(s.id, e.target.value)}
                >
                  {['ADMIN', 'MANAGER', 'VIEWER'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  onClick={() => toggleStatus(s.id, s.status)}
                  className={`badge cursor-pointer ${s.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-stone-500 bg-stone-500/10 border-stone-500/30'}`}
                  title="Click to toggle"
                >
                  {s.status}
                </button>
                <button onClick={() => removeStaff(s.id)} className="text-stone-500 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {staff.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-6">No team members added yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="card bg-surface flex gap-3 items-start">
        <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-stone-400 leading-relaxed">
          <strong className="text-stone-300">VIEWER</strong> can only view data. <strong className="text-stone-300">MANAGER</strong> can
          create and edit talent, campaigns, earnings, expenses, and clients. <strong className="text-stone-300">ADMIN</strong> can also
          delete records, manage the team, and edit agency settings. A team member signs in with the email
          below via Google, GitHub, or a magic link — it doesn't need to match their login provider, just the
          email address itself.
        </p>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <h2 className="text-base font-semibold text-white">Add Team Member</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-stone-400 hover:text-white" /></button>
            </div>
            <form onSubmit={addStaff} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1.5">Email *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1.5">Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1.5">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {['ADMIN', 'MANAGER', 'VIEWER'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Adding…' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
