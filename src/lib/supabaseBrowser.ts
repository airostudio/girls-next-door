'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Browser Supabase client, anon key only — used solely to PUT a file at a signed
 * upload URL the server has already authorised. The service-role key never
 * reaches the browser; the server decides whether an upload is allowed (role
 * check + the 10-item cap) and only then hands back a one-shot signed URL.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Supabase browser env vars are not set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    }
    _client = createClient(url, key)
  }
  return _client
}
