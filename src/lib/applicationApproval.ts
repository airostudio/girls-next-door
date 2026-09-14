import { supabase } from '@/lib/supabase'
import { normalizeEmail } from '@/lib/rbac'

/**
 * Turning a reviewed application into an account, and back again.
 *
 * Approving used to record a decision and nothing else, so an approved
 * applicant signing in still matched no talent or supplier row, was refused,
 * and was sent back to the join form they had already filled in. Approval now
 * creates the record their login resolves to.
 *
 * It deliberately creates a TALENT or SUPPLIER record, never a `staff` row.
 * Every agency route is gated at VIEWER, the floor of the role ladder, so a
 * staff row would hand an applicant the agency's books and every model's
 * earnings. Members have no role at all — the portal routes derive their record
 * from the session instead.
 */

export type ApplicationRow = {
  id: string
  kind: string
  full_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  country: string | null
  business_name: string | null
  website: string | null
  instagram: string | null
  about: string | null
}

export type ProvisionResult =
  | { created: true;  table: 'talent' | 'suppliers'; id: string }
  | { created: false; reason: 'already-provisioned' | 'email-taken' | 'bad-email' | 'failed'; detail?: string }

/** Instagram is the only social handle the form collects; stored in the same shape the profile editor reads. */
function socialLinks(instagram: string | null): string | null {
  const handle = instagram?.trim()
  if (!handle) return null
  return JSON.stringify({ instagram: handle.replace(/^@/, '') })
}

/**
 * Creates the talent or supplier record for an approved application.
 *
 * Safe to call more than once: it returns without creating anything if this
 * application already has a record, or if the address belongs to someone
 * already on the roster.
 */
export async function provisionFromApplication(app: ApplicationRow): Promise<ProvisionResult> {
  const isSupplier = app.kind === 'SUPPLIER'
  const table = isSupplier ? 'suppliers' : 'talent'
  const emailColumn = isSupplier ? 'contact_email' : 'email'

  // The same normalization the sign-in check uses. Storing anything else means
  // the record exists but no one can ever sign in to it, because resolveAccess
  // compares normalized addresses with an exact match.
  const email = normalizeEmail(app.email ?? '')
  if (!email) return { created: false, reason: 'bad-email' }

  const { data: existing } = await supabase
    .from(table).select('id').eq('application_id', app.id).maybeSingle()
  if (existing) return { created: false, reason: 'already-provisioned' }

  // Someone already on the roster with this address — reactivating or merging
  // is a judgement call for staff, not something to do silently.
  const { data: sameEmail } = await supabase
    .from(table).select('id').eq(emailColumn, email).maybeSingle()
  if (sameEmail) return { created: false, reason: 'email-taken' }

  const common = {
    application_id: app.id,
    status: 'ACTIVE',          // findPortalRecord only matches ACTIVE rows
  }

  // Annotated rather than inferred: supabase-js types .insert() against the
  // first member of a union, so a ternary producing two different row shapes is
  // rejected for "missing" the other branch's columns.
  const row: Record<string, unknown> = isSupplier
    ? {
        ...common,
        // Suppliers are businesses; fall back to the person's name when they
        // didn't give a trading name, so the record is never nameless.
        name:          app.business_name?.trim() || app.full_name || email,
        contact_name:  app.full_name ?? null,
        contact_email: email,
        contact_phone: app.phone ?? null,
        website:       app.website ?? null,
        city:          app.city ?? null,
        country:       app.country ?? null,
        notes:         app.about ?? null,
      }
    : {
        ...common,
        name:         app.full_name || email,
        email,
        phone:        app.phone ?? null,
        nationality:  app.country ?? null,
        bio:          app.about ?? null,
        social_links: socialLinks(app.instagram),
      }

  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) return { created: false, reason: 'failed', detail: error.message }

  return { created: true, table, id: (data as { id: string }).id }
}

/**
 * Withdraws the account an approval created.
 *
 * Deactivates rather than deletes: the record may already have media, a profile
 * and a linked login, and deleting it would cascade that away on what may be a
 * misclick. INACTIVE is enough — findPortalRecord only matches ACTIVE rows, so
 * the next sign-in is refused.
 */
export async function revokeForApplication(applicationId: string): Promise<void> {
  const patch = { status: 'INACTIVE', updated_at: new Date().toISOString() }
  await supabase.from('talent').update(patch).eq('application_id', applicationId)
  await supabase.from('suppliers').update(patch).eq('application_id', applicationId)
}
