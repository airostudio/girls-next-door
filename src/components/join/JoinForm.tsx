'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Camera, Sparkles } from 'lucide-react'
import Logo from '@/components/layout/Logo'

const EXPERIENCE = [
  { value: 'NONE',         label: 'Just starting out' },
  { value: 'SOME',         label: 'Some experience' },
  { value: 'EXPERIENCED',  label: 'Experienced' },
  { value: 'PROFESSIONAL', label: 'Working professionally' },
] as const

const EMPTY = {
  kind: 'TALENT' as 'TALENT' | 'SUPPLIER',
  fullName: '', email: '', phone: '', city: '', country: '',
  businessName: '', taxId: '', website: '', instagram: '',
  experience: 'SOME', about: '',
  company: '', // honeypot
}

export default function JoinForm({ agencyName }: { agencyName: string }) {
  const [form,    setForm]    = useState({ ...EMPTY })
  const [over18,  setOver18]  = useState(false)
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const isSupplier = form.kind === 'SUPPLIER'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, over18, consent }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,145,42,0.08) 0%, transparent 60%), #0a0a0a' }}
      >
        <div className="w-full max-w-md text-center">
          <div className="mb-8"><Logo alt={agencyName} /></div>
          <div className="card">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-4 text-emerald-400" />
            <h1 className="font-display text-xl font-semibold text-stone-50 mb-2">Application received</h1>
            <p className="text-sm text-stone-400 leading-relaxed">
              Thanks — someone from {agencyName} will review it and get in touch by email.
              You don&apos;t need to do anything else.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,145,42,0.08) 0%, transparent 60%), #0a0a0a' }}
    >
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-8"><Logo alt={agencyName} /></div>

        <div className="card">
          <h1 className="font-display text-xl font-semibold text-stone-50 mb-1">Join {agencyName}</h1>
          <p className="text-xs text-stone-500 mb-6">
            Tell us about yourself. We review every application and reply by email.
          </p>

          <form onSubmit={submit} className="space-y-4">
            {/* Who's applying */}
            <fieldset>
              <legend className="block text-xs text-stone-400 mb-2">I&apos;m applying as</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'TALENT',   label: 'Talent',   hint: 'Model or creator', icon: Sparkles },
                  { value: 'SUPPLIER', label: 'Supplier', hint: 'Photographer, MUA, studio', icon: Camera },
                ] as const).map(({ value, label, hint, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('kind', value)}
                    className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                      form.kind === value
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-surface-border hover:border-brand-600/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${form.kind === value ? 'text-brand-400' : 'text-stone-500'}`} />
                    <div className="text-sm font-medium text-stone-100">{label}</div>
                    <div className="text-[11px] text-stone-500 leading-tight">{hint}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Personal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="join-name" className="block text-xs text-stone-400 mb-1.5">Full name *</label>
                <input id="join-name" required className="input" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
              </div>
              <div>
                <label htmlFor="join-email" className="block text-xs text-stone-400 mb-1.5">Email *</label>
                <input id="join-email" type="email" required className="input" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label htmlFor="join-phone" className="block text-xs text-stone-400 mb-1.5">Phone</label>
                <input id="join-phone" className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label htmlFor="join-city" className="block text-xs text-stone-400 mb-1.5">City</label>
                <input id="join-city" className="input" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label htmlFor="join-country" className="block text-xs text-stone-400 mb-1.5">Country</label>
                <input id="join-country" className="input" value={form.country} onChange={e => set('country', e.target.value)} />
              </div>
            </div>

            {/* Business */}
            <div className="pt-1">
              <p className="text-[11px] text-stone-500 uppercase tracking-widest mb-2.5">Business details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="join-business" className="block text-xs text-stone-400 mb-1.5">
                    {isSupplier ? 'Business name' : 'Trading name'}
                  </label>
                  <input id="join-business" className="input" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="join-tax" className="block text-xs text-stone-400 mb-1.5">ABN / Tax ID</label>
                  <input id="join-tax" className="input" value={form.taxId} onChange={e => set('taxId', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="join-site" className="block text-xs text-stone-400 mb-1.5">Website</label>
                  <input id="join-site" className="input" placeholder="https://" value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="join-ig" className="block text-xs text-stone-400 mb-1.5">Instagram</label>
                  <input id="join-ig" className="input" placeholder="@handle" value={form.instagram} onChange={e => set('instagram', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="join-exp" className="block text-xs text-stone-400 mb-1.5">Experience</label>
              <select id="join-exp" className="input" value={form.experience} onChange={e => set('experience', e.target.value)}>
                {EXPERIENCE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="join-about" className="block text-xs text-stone-400 mb-1.5">
                {isSupplier ? 'What do you do, and who have you worked with?' : 'Tell us about yourself'}
              </label>
              <textarea id="join-about" rows={4} className="input resize-none" value={form.about} onChange={e => set('about', e.target.value)} />
            </div>

            {/* Honeypot — off-screen rather than display:none, which some bots skip. */}
            <div aria-hidden="true" className="absolute left-[-9999px] w-px h-px overflow-hidden">
              <label htmlFor="join-company">Company</label>
              <input id="join-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={e => set('company', e.target.value)} />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-stone-400 cursor-pointer">
                <input id="join-over18" type="checkbox" checked={over18} onChange={e => setOver18(e.target.checked)} className="mt-0.5 accent-brand-500" />
                <span>I confirm I am 18 years of age or older.</span>
              </label>
              <label className="flex items-start gap-2.5 text-xs text-stone-400 cursor-pointer">
                <input id="join-consent" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-brand-500" />
                <span>I agree that {agencyName} may store these details to assess my application and contact me about it.</span>
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={sending || !over18 || !consent} className="btn-primary w-full py-2.5 disabled:opacity-50">
              {sending ? 'Submitting…' : 'Submit application'}
            </button>

            <p className="text-[11px] text-stone-600 text-center leading-relaxed">
              Already on the team? <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
