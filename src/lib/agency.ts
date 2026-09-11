import { supabase } from '@/lib/supabase'

export interface AgencyBranding {
  agencyName: string
  logoUrl: string | null
}

// Falls back to this if agency_settings is empty or Supabase isn't reachable
// (e.g. local dev without env vars configured yet) — every page that renders
// branding goes through here, so it must never throw.
const DEFAULT_BRANDING: AgencyBranding = { agencyName: 'Clarity 4K', logoUrl: null }

export async function getAgencyBranding(): Promise<AgencyBranding> {
  try {
    const { data } = await supabase
      .from('agency_settings')
      .select('agency_name, logo_url')
      .eq('id', 'default')
      .single()
    if (!data) return DEFAULT_BRANDING
    return {
      agencyName: data.agency_name || DEFAULT_BRANDING.agencyName,
      logoUrl: data.logo_url ?? null,
    }
  } catch {
    return DEFAULT_BRANDING
  }
}
