import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// Lazily initialised — only creates the client on first request, not at build time
export function getSupabase(): SupabaseClient {
  if (!_client) {
    // Trimmed: a value pasted into a dashboard env var often carries a
    // trailing newline or space, and PostgREST rejects the request as
    // "Invalid API key" without ever hinting that whitespace is the cause.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!url || !key) throw new Error('Supabase env vars are not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    _client = createClient(url, key)
  }
  return _client
}

// Convenience alias used in API routes
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  },
})

// Transform a snake_case object (or array) to camelCase for the frontend
export function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel)
  if (obj === null || typeof obj !== 'object') return obj
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      toCamel(v),
    ])
  )
}
