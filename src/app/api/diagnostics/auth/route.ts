export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/apiAuth'
import { MEDIA_BUCKET } from '@/lib/media'
import { mailTransport } from '@/lib/mailer'
import { inspectSupabaseKey, explainRejection } from '@/lib/supabaseKey'

type Check = { name: string; ok: boolean; detail: string; fix?: string }

/**
 * Admin-only configuration check.
 *
 * Sign-in failures surface to the user as a single opaque word — "Callback" —
 * while the real cause sits in a server log nobody sees. This reports what is
 * actually reachable so a misconfiguration can be identified without deploying
 * again to read logs.
 *
 * It is reachable when OAuth is broken because the break-glass admin login
 * doesn't touch the adapter. It reports presence and reachability only, never
 * the value of a secret.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const checks: Check[] = []
  const env = (k: string) => Boolean(process.env[k])

  const need = (name: string, key: string, fix: string) =>
    checks.push({ name, ok: env(key), detail: env(key) ? 'set' : 'not set', fix: env(key) ? undefined : fix })

  need('NEXTAUTH_SECRET', 'NEXTAUTH_SECRET', 'Generate with: openssl rand -base64 32')
  need('Supabase URL', 'NEXT_PUBLIC_SUPABASE_URL', 'Supabase → Settings → API → Project URL')
  need('Supabase service role key', 'SUPABASE_SERVICE_ROLE_KEY', 'Supabase → Settings → API → service_role')
  need('Google client ID', 'GOOGLE_CLIENT_ID', 'Google Cloud Console → Credentials')
  need('Google client secret', 'GOOGLE_CLIENT_SECRET', 'Google Cloud Console → Credentials')
  const transport = mailTransport()
  checks.push({
    name: 'Mail transport',
    ok: transport !== null,
    detail: transport === 'resend' ? 'Resend API (RESEND_API_KEY)'
          : transport === 'smtp'   ? 'SMTP (EMAIL_SERVER)'
          : 'not configured',
    fix: transport ? undefined
       : 'Set RESEND_API_KEY (or EMAIL_SERVER) plus EMAIL_FROM. Without one the magic-link option is hidden.',
  })
  need('Mail from-address', 'EMAIL_FROM', 'Must be on a domain verified in Resend, e.g. no-reply@girlsnextdoor.online')
  need('Break-glass admin', 'ADMIN_EMAIL', 'Needed to bootstrap access')

  // NEXTAUTH_URL has to match the origin the browser is actually on, or OAuth
  // callbacks and magic links are built for the wrong host.
  const configured = process.env.NEXTAUTH_URL
  const actual = req.nextUrl.origin
  if (!configured) {
    checks.push({
      name: 'NEXTAUTH_URL', ok: false, detail: 'not set',
      fix: `On a custom domain this must be set explicitly, to ${actual}`,
    })
  } else {
    let match = false
    try { match = new URL(configured).origin === actual } catch { /* unparseable */ }
    checks.push({
      name: 'NEXTAUTH_URL', ok: match,
      detail: match ? `matches ${actual}` : `is ${configured} but you are on ${actual}`,
      fix: match ? undefined : `Set it to exactly ${actual} — OAuth redirects and magic links are built from it`,
    })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  // Read the credentials before using them. A key for the wrong project, the
  // publishable key in place of the secret one, or an expired one all fail
  // identically at request time — as a flat "Invalid API key" — so the shape is
  // worth checking separately from whether the request works.
  const keyReport = inspectSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  checks.push({ name: 'Supabase key', ok: keyReport.ok, detail: keyReport.detail, fix: keyReport.fix })

  if (url && key) {
    // The app's own tables.
    try {
      const { error } = await createClient(url, key).from('staff').select('id').limit(1)
      checks.push({
        name: 'Database — public schema', ok: !error,
        detail: error ? `${error.code ?? ''} ${error.message}`.trim() : 'reachable',
        fix: error
          ? explainRejection(error.message, key) ?? 'Run supabase/schema.sql in the Supabase SQL editor'
          : undefined,
      })
    } catch (e: any) {
      checks.push({ name: 'Database — public schema', ok: false, detail: e?.message ?? 'unreachable' })
    }

    // Tables the auth adapter uses. These live in `public` on purpose — a
    // dedicated schema has to be added to Supabase's Exposed schemas by hand,
    // and when it isn't, every sign-in fails with "PGRST106 Invalid schema".
    try {
      const { error } = await createClient(url, key).from('auth_users').select('id').limit(1)
      checks.push({
        name: 'Database — auth tables', ok: !error,
        detail: error ? `${error.code ?? ''} ${error.message}`.trim() : 'reachable',
        fix: error
          ? explainRejection(error.message, key)
            ?? 'Run supabase/schema.sql in the Supabase SQL editor — it creates auth_users, auth_accounts and auth_verification_tokens.'
          : undefined,
      })
    } catch (e: any) {
      checks.push({ name: 'Database — auth tables', ok: false, detail: e?.message ?? 'unreachable' })
    }

    // Storage bucket for portfolio uploads.
    try {
      const { error } = await createClient(url, key).storage.from(MEDIA_BUCKET).list('', { limit: 1 })
      checks.push({
        name: `Storage bucket "${MEDIA_BUCKET}"`, ok: !error,
        detail: error ? error.message : 'reachable',
        fix: error
          ? explainRejection(error.message, key) ?? `Supabase → Storage → New bucket named ${MEDIA_BUCKET}, public`
          : undefined,
      })
    } catch (e: any) {
      checks.push({ name: `Storage bucket "${MEDIA_BUCKET}"`, ok: false, detail: e?.message ?? 'unreachable' })
    }
  }

  return NextResponse.json({
    ok: checks.every(c => c.ok),
    checks,
  })
}
