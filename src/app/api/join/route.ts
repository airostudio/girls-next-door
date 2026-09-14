export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateBody, ApplicationCreateSchema } from '@/lib/validation'

/**
 * The only unauthenticated write endpoint in the app.
 *
 * It creates an APPLICATION — a claim by a stranger — and nothing else. It
 * cannot create a `staff` row, so submitting this form never grants access to
 * the agency app. Turning an approved application into a talent or supplier
 * record is a deliberate act by an admin.
 *
 * Being public, it is also the one route a bot can reach: hence the honeypot
 * field, the length caps in the schema, and a unique index that allows only one
 * open application per address.
 */
export async function POST(req: NextRequest) {
  const validation = await validateBody(req, ApplicationCreateSchema)
  if (!validation.ok) return validation.response
  const b = validation.data

  // Honeypot filled in — accept silently so the bot doesn't learn it was caught.
  if (b.company) return NextResponse.json({ success: true }, { status: 201 })

  const { error } = await supabase.from('applications').insert({
    kind:          b.kind,
    full_name:     b.fullName,
    email:         b.email.toLowerCase(),
    phone:         b.phone        || null,
    city:          b.city         || null,
    country:       b.country      || null,
    business_name: b.businessName || null,
    tax_id:        b.taxId        || null,
    website:       b.website      || null,
    instagram:     b.instagram    || null,
    experience:    b.experience   || null,
    about:         b.about        || null,
  })

  if (error) {
    // 23505 = the one-open-application-per-email index.
    if (error.code === '23505') {
      return NextResponse.json(
        { error: "You already have an application with us — we'll be in touch." },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Could not submit your application just now.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
