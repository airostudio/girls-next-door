export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { validateBody, StaffCreateSchema } from '@/lib/validation'

// Team management is an admin-only surface — it controls who can sign in at all.
export async function GET() {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toCamel(data ?? []))
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const validation = await validateBody(req, StaffCreateSchema)
  if (!validation.ok) return validation.response
  const body = validation.data

  const { data, error } = await supabase
    .from('staff')
    .insert({
      email:  body.email.toLowerCase(),
      name:   body.name,
      role:   body.role   ?? 'VIEWER',
      status: body.status ?? 'ACTIVE',
    })
    .select()
    .single()

  if (error) {
    const status = error.code === '23505' ? 409 : 400 // unique_violation
    return NextResponse.json({ error: error.code === '23505' ? 'That email is already on the team' : error.message }, { status })
  }
  return NextResponse.json(toCamel(data), { status: 201 })
}
