'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert, Mail, MailCheck, KeyRound } from 'lucide-react'
import Logo from '@/components/layout/Logo'

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}


interface Props { agencyName: string; magicLinkEnabled: boolean }

export default function LoginForm({ agencyName, magicLinkEnabled }: Props) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner agencyName={agencyName} magicLinkEnabled={magicLinkEnabled} />
    </Suspense>
  )
}

function LoginFormInner({ agencyName, magicLinkEnabled }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')

  const ERROR_MESSAGES: Record<string, string> = {
    AccessDenied: `That account isn't authorised for ${agencyName}. Contact your admin if you believe this is a mistake.`,
    OAuthAccountNotLinked: 'That email is already tied to a different sign-in method. Try the provider you used originally.',
    Verification: 'That login link has expired or was already used. Request a new one below.',
  }
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? `Sign-in failed (${errorCode}). Please try again or contact your admin.`
    : null

  // One email field shared by both email routes: type it once, then either
  // enter a password or ask for a link. Both are visible — no mode toggle, so
  // neither route is hidden behind a click.
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [pending,  setPending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [formError, setFormError] = useState('')

  async function sendMagicLink() {
    if (!email.trim()) { setFormError('Enter your email address first.'); return }
    setFormError('')
    setPending(true)
    try {
      await signIn('email', { email, redirect: false, callbackUrl: '/dashboard' })
      // Always show the same confirmation, whether or not this address is
      // actually allow-listed — the response shouldn't reveal that.
      setSent(true)
    } catch {
      setFormError("Couldn't send a login link just now. Try a password, or contact your admin.")
    } finally {
      setPending(false)
    }
  }

  async function passwordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setFormError('')
    const res = await signIn('password', {
      email, password, redirect: false, callbackUrl: '/dashboard',
    })
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      // Deliberately does not distinguish an unknown address from a wrong
      // password, or say whether the account has a password at all.
      setFormError('Those details did not match an account.')
      setPending(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,145,42,0.08) 0%, transparent 60%), #0a0a0a' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="md" alt={agencyName} />
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold text-stone-50 mb-1">Sign in to your account</h2>
          <p className="text-xs text-stone-500 mb-6">{magicLinkEnabled
              ? 'Use your Google account, a password, or a link sent to your email.'
              : 'Use your Google account, or your email and password.'}</p>

          {errorMessage && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5 mb-4">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border border-gray-200"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-surface-border flex-1" />
            <span className="text-[11px] text-stone-500 uppercase tracking-wide">or</span>
            <div className="h-px bg-surface-border flex-1" />
          </div>

          {sent ? (
            <div className="flex items-start gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2.5">
              <MailCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>If that email has access, a login link is on its way — check your inbox.</span>
            </div>
          ) : (
            <>
              <form onSubmit={passwordSignIn} className="space-y-2.5">
                <div>
                  <label htmlFor="login-email" className="block text-xs text-stone-400 mb-1.5">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    className="input"
                    placeholder="you@girlsnextdoor.agency"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs text-stone-400 mb-1.5">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                {formError && (
                  <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {pending ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {/* Passwordless route, sharing the email field above. A plain
                  button rather than a second form, so the required password
                  input can't block it. Hidden when no mail transport is
                  configured — offering a button that can only fail is worse
                  than not offering it. */}
              {magicLinkEnabled && (
              <div className="mt-5 pt-4 border-t border-surface-border">
                <p className="text-[11px] text-stone-500 mb-2.5 text-center">
                  No password? We&apos;ll email you a one-time sign-in link.
                </p>
                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={pending}
                  className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {pending ? 'Sending…' : 'Email me a login link'}
                </button>
              </div>
              )}
            </>
          )}

          <p className="text-[11px] text-stone-500 text-center mt-5 leading-relaxed">
            Access is restricted to authorised team members.<br />
            Contact your admin if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}
