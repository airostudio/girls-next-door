export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { MEDIA_BUCKET } from '@/lib/media'
import { resolveOwner } from '../_shared'

type Ctx = { params: { ownerType: string; ownerId: string; mediaId: string } }

/** Set as thumbnail, re-caption, or move within the running order. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const owner = await resolveOwner(params.ownerType, params.ownerId)
  if (!owner.ok) return owner.response

  let body: { isPrimary?: boolean; caption?: string; sortOrder?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { data: item } = await supabase
    .from('media').select('*')
    .eq('id', params.mediaId).eq(owner.column, params.ownerId).single()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row: Record<string, unknown> = {}
  if (body.caption   !== undefined) row.caption    = body.caption
  if (body.sortOrder !== undefined) row.sort_order = body.sortOrder

  if (body.isPrimary === true) {
    if (item.kind !== 'PHOTO') {
      return NextResponse.json({ error: 'Only a photo can be the thumbnail' }, { status: 400 })
    }
    // One primary per owner is a unique index, so the old one has to be cleared
    // before the new one is set or the update trips the constraint.
    await supabase.from('media').update({ is_primary: false })
      .eq(owner.column, params.ownerId).eq('is_primary', true)
    row.is_primary = true
  }

  const { data, error } = await supabase
    .from('media').update(row).eq('id', params.mediaId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (row.is_primary && owner.type === 'talent') {
    await supabase.from('talent').update({ avatar: data.url }).eq('id', params.ownerId)
  }

  return NextResponse.json(toCamel(data))
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const owner = await resolveOwner(params.ownerType, params.ownerId)
  if (!owner.ok) return owner.response

  const { data: item } = await supabase
    .from('media').select('*')
    .eq('id', params.mediaId).eq(owner.column, params.ownerId).single()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('media').delete().eq('id', params.mediaId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (item.storage_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([item.storage_path])
  }

  // Removing the thumbnail promotes the next photo so the record doesn't
  // silently lose its image.
  if (item.is_primary) {
    const { data: next } = await supabase
      .from('media').select('*')
      .eq(owner.column, params.ownerId).eq('kind', 'PHOTO')
      .order('sort_order', { ascending: true }).limit(1)

    const promoted = next?.[0]
    if (promoted) {
      await supabase.from('media').update({ is_primary: true }).eq('id', promoted.id)
    }
    if (owner.type === 'talent') {
      await supabase.from('talent').update({ avatar: promoted?.url ?? null }).eq('id', params.ownerId)
    }
  }

  return NextResponse.json({ success: true })
}
