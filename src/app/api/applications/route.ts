export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'

/** Staff-only: the review queue for submissions from the public join form. */
export async function GET() {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toCamel(data ?? []))
}
