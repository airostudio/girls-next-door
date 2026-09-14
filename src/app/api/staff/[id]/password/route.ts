export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { hashPassword, checkPasswordStrength } from '@/lib/password'

/**
 * Sets or replaces a staff member's sign-in password. Admin-only, like the rest
 * of team management — this grants access to the whole agency.
 *
 * The hash is never returned, and the plaintext is never stored or logged.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const password = body.password
  if (!password) return NextResponse.json({ error: 'A password is required' }, { status: 400 })

  const weak = checkPasswordStrength(password)
  if (weak) return NextResponse.json({ error: weak }, { status: 400 })

  const { data: staff } = await supabase.from('staff').select('id').eq('id', params.id).single()
  if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('staff')
    .update({
      password_hash:       await hashPassword(password),
      password_updated_at: new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

/** Removes the password, leaving Google and magic link as the way in. */
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth.response

  const { error } = await supabase
    .from('staff')
    .update({ password_hash: null, password_updated_at: null, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
