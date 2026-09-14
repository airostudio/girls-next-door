/**
 * Inspection of the Supabase credentials, for the setup diagnostic.
 *
 * A wrong key does not announce itself. PostgREST answers every request with
 * "Invalid API key", the app's own catch blocks fall back to defaults, and the
 * only visible symptom is something unrelated — sign-in reporting "Callback",
 * or the agency name reverting to its placeholder. This turns that into a
 * statement of what is actually wrong.
 *
 * Nothing here reveals the key. A legacy Supabase key is a JWT whose payload is
 * base64, not encrypted — the signature is the secret part — so the project ref
 * and role inside it can be read and compared against the configured URL
 * without exposing anything that isn't already public in the token's structure.
 */

export type KeyReport = {
  ok: boolean
  detail: string
  fix?: string
}

/** Project ref from a Supabase URL: https://<ref>.supabase.co */
function refFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname
    const m = host.match(/^([a-z0-9]+)\.supabase\.(co|in)$/i)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/** Decodes a JWT payload without verifying it. Returns null for non-JWTs. */
function jwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function inspectSupabaseKey(rawUrl: string | undefined, rawKey: string | undefined): KeyReport {
  if (!rawUrl || !rawKey) {
    return { ok: false, detail: 'not set', fix: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }
  }

  // Checked before trimming: a pasted value that carries a newline or a space
  // is rejected by PostgREST as an invalid key, with no hint that whitespace is
  // the cause. The client trims, so this is a report, not a failure.
  if (rawKey !== rawKey.trim() || rawUrl !== rawUrl.trim()) {
    return {
      ok: false,
      detail: 'has leading or trailing whitespace',
      fix: 'Re-paste the value in Vercel with no trailing space or newline, then redeploy.',
    }
  }

  const key = rawKey.trim()
  const url = rawUrl.trim()

  // Current-generation keys. Opaque, so only the prefix can be checked.
  if (key.startsWith('sb_secret_')) return { ok: true, detail: 'secret key (sb_secret_…)' }
  if (key.startsWith('sb_publishable_')) {
    return {
      ok: false,
      detail: 'this is the PUBLISHABLE key, not the secret key',
      fix: 'Supabase → Project Settings → API keys → copy the secret key (sb_secret_…) into SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  // Legacy JWT keys.
  const payload = jwtPayload(key)
  if (!payload) {
    return {
      ok: false,
      detail: 'not a recognised Supabase key (neither sb_secret_… nor a JWT)',
      fix: 'Copy the value again from Supabase → Project Settings → API keys.',
    }
  }

  const role = typeof payload.role === 'string' ? payload.role : null
  if (role && role !== 'service_role') {
    return {
      ok: false,
      detail: `this key's role is "${role}", not service_role`,
      fix: 'The anon key cannot read these tables. Copy the service_role key instead.',
    }
  }

  const keyRef = typeof payload.ref === 'string' ? payload.ref : null
  const urlRef = refFromUrl(url)
  if (keyRef && urlRef && keyRef !== urlRef) {
    return {
      ok: false,
      detail: `key belongs to project "${keyRef}" but the URL points at "${urlRef}"`,
      fix: 'The URL and the key are from two different Supabase projects. Take both from the same project.',
    }
  }

  const exp = typeof payload.exp === 'number' ? payload.exp : null
  if (exp && exp * 1000 < Date.now()) {
    return {
      ok: false,
      detail: `expired on ${new Date(exp * 1000).toISOString().slice(0, 10)}`,
      fix: 'Generate a new service_role key in Supabase and update SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  return { ok: true, detail: `legacy service_role JWT for project "${keyRef ?? 'unknown'}"` }
}

/**
 * The remedy for a live rejection. Supabase answers "Invalid API key" both for a
 * key that was never right and for a legacy key that is structurally perfect but
 * has since been disabled — since mid-2025 a project can turn legacy JWT keys
 * off, after which they are refused with no further explanation.
 */
export function explainRejection(message: string, key: string | undefined): string | undefined {
  if (!/invalid api key/i.test(message)) return undefined
  const legacy = Boolean(key?.trim().startsWith('eyJ'))
  return legacy
    ? 'Supabase is refusing this key. If legacy API keys were disabled or rotated for this project, the old service_role JWT stops working: Supabase → Project Settings → API keys → create a secret key (sb_secret_…) and put it in SUPABASE_SERVICE_ROLE_KEY, then redeploy.'
    : 'Supabase is refusing this key. Copy it again from Supabase → Project Settings → API keys, then redeploy.'
}
