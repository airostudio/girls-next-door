export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { MEDIA_BUCKET } from '@/lib/media'

type Ctx = { params: { id: string; mediaId: string } }

/** Set as profile shot, re-caption, or move within the running order. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  let body: { isPrimary?: boolean; caption?: string; sortOrder?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { data: item } = await supabase
    .from('talent_media').select('*')
    .eq('id', params.mediaId).eq('talent_id', params.id).single()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row: Record<string, unknown> = {}
  if (body.caption   !== undefined) row.caption    = body.caption
  if (body.sortOrder !== undefined) row.sort_order = body.sortOrder

  if (body.isPrimary === true) {
    if (item.kind !== 'PHOTO') {
      return NextResponse.json({ error: 'Only a photo can be the profile shot' }, { status: 400 })
    }
    // One primary per talent is a unique index, so the old one has to be cleared
    // before the new one is set or the update trips the constraint.
    await supabase.from('talent_media').update({ is_primary: false })
      .eq('talent_id', params.id).eq('is_primary', true)
    row.is_primary = true
  }

  const { data, error } = await supabase
    .from('talent_media').update(row).eq('id', params.mediaId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (row.is_primary) {
    await supabase.from('talent').update({ avatar: data.url }).eq('id', params.id)
  }

  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const { data: item } = await supabase
    .from('talent_media').select('*')
    .eq('id', params.mediaId).eq('talent_id', params.id).single()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('talent_media').delete().eq('id', params.mediaId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (item.storage_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([item.storage_path])
  }

  // Removing the profile shot promotes the next photo so the talent doesn't
  // silently lose their avatar.
  if (item.is_primary) {
    const { data: next } = await supabase
      .from('talent_media').select('*')
      .eq('talent_id', params.id).eq('kind', 'PHOTO')
      .order('sort_order', { ascending: true }).limit(1)

    const promoted = next?.[0]
    if (promoted) {
      await supabase.from('talent_media').update({ is_primary: true }).eq('id', promoted.id)
      await supabase.from('talent').update({ avatar: promoted.url }).eq('id', params.id)
    } else {
      await supabase.from('talent').update({ avatar: null }).eq('id', params.id)
    }
  }

  return NextResponse.json({ success: true })
}
