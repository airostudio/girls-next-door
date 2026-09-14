import { supabase } from '@/lib/supabase'

export interface AgencyBranding {
  agencyName: string
  logoUrl: string | null
}

// Falls back to this if agency_settings is empty or Supabase isn't reachable
// (e.g. local dev without env vars configured yet) — every page that renders
// branding goes through here, so it must never throw.
const DEFAULT_BRANDING: AgencyBranding = { agencyName: 'Girls Next Door Talent Agency', logoUrl: null }

export async function getAgencyBranding(): Promise<AgencyBranding> {
  try {
    const { data, error } = await supabase
      .from('agency_settings')
      .select('agency_name, logo_url')
      .eq('id', 'default')
      .single()
    // Never throws, but it must not go quiet either. When the database is
    // unreachable this fallback is the ONLY visible symptom — the site simply
    // renders the placeholder name — and a credential failure can sit behind it
    // for days while attention goes to whatever else happens to be broken.
    if (error) console.error('[agency] branding lookup failed, using fallback:', error.message)
    if (!data) return DEFAULT_BRANDING
    return {
      agencyName: data.agency_name || DEFAULT_BRANDING.agencyName,
      logoUrl: data.logo_url ?? null,
    }
  } catch {
    return DEFAULT_BRANDING
  }
}
