export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireAccount } from '@/lib/apiAuth'
import { MEDIA_BUCKET } from '@/lib/media'

const ownerColumnFor = (t: 'TALENT' | 'SUPPLIER') => (t === 'TALENT' ? 'talent_id' : 'supplier_id')

type Ctx = { params: { mediaId: string } }

/**
 * Every query filters on BOTH the media id and the caller's own owner column.
 * The id alone would be enough to find the row — and that is exactly the bug:
 * a member could pass someone else's media id and act on it. Scoping the query
 * means another member's id simply matches nothing.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireAccount()
  if (!auth.ok) return auth.response

  let body: { isPrimary?: boolean; caption?: string; sortOrder?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const column = ownerColumnFor(auth.accountType)
  const { data: item } = await supabase
    .from('media').select('*')
    .eq('id', params.mediaId).eq(column, auth.accountId).maybeSingle()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row: Record<string, unknown> = {}
  if (body.caption   !== undefined) row.caption    = body.caption
  if (body.sortOrder !== undefined) row.sort_order = body.sortOrder

  if (body.isPrimary === true) {
    if (item.kind !== 'PHOTO') {
      return NextResponse.json({ error: 'Only a photo can be the main image' }, { status: 400 })
    }
    await supabase.from('media').update({ is_primary: false })
      .eq(column, auth.accountId).eq('is_primary', true)
    row.is_primary = true
  }

  const { data, error } = await supabase
    .from('media').update(row).eq('id', params.mediaId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (row.is_primary && auth.accountType === 'TALENT') {
    await supabase.from('talent').update({ avatar: data.url }).eq('id', auth.accountId)
  }

  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const auth = await requireAccount()
  if (!auth.ok) return auth.response

  const column = ownerColumnFor(auth.accountType)
  const { data: item } = await supabase
    .from('media').select('*')
    .eq('id', params.mediaId).eq(column, auth.accountId).maybeSingle()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('media').delete().eq('id', params.mediaId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (item.storage_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([item.storage_path])
  }

  // Removing the main image promotes the next photo, so a profile never
  // silently loses its thumbnail.
  if (item.is_primary) {
    const { data: next } = await supabase
      .from('media').select('*')
      .eq(column, auth.accountId).eq('kind', 'PHOTO')
      .order('sort_order', { ascending: true }).limit(1)

    const promoted = next?.[0]
    if (promoted) {
      await supabase.from('media').update({ is_primary: true }).eq('id', promoted.id)
    }
    if (auth.accountType === 'TALENT') {
      await supabase.from('talent').update({ avatar: promoted?.url ?? null }).eq('id', auth.accountId)
    }
  }

  return NextResponse.json({ success: true })
}
