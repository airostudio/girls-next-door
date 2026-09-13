export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { MEDIA_BUCKET, MAX_MEDIA_PER_TALENT, type MediaKind } from '@/lib/media'
import { resolveOwner } from './_shared'

type Ctx = { params: { ownerType: string; ownerId: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const owner = await resolveOwner(params.ownerType, params.ownerId)
  if (!owner.ok) return owner.response

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq(owner.column, params.ownerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data ?? []))
}

/**
 * Records an upload that has already landed in storage. Called by the browser
 * after it PUTs the file to the signed URL from ./sign.
 *
 * If the row can't be written, the just-uploaded object is deleted rather than
 * left behind — an orphaned file still counts against storage but is invisible
 * to the app, so nothing else would ever clean it up.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const owner = await resolveOwner(params.ownerType, params.ownerId)
  if (!owner.ok) return owner.response

  let body: { path?: string; kind?: MediaKind; caption?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { path, kind, caption } = body
  if (!path || (kind !== 'PHOTO' && kind !== 'VIDEO')) {
    return NextResponse.json({ error: 'path and kind are required' }, { status: 400 })
  }
  // The signed URL was scoped to this owner's prefix; refuse a path claiming
  // to belong to a different record.
  if (!path.startsWith(`${owner.type}/${params.ownerId}/`)) {
    return NextResponse.json({ error: 'That upload does not belong to this record' }, { status: 400 })
  }

  const discard = async () => { await supabase.storage.from(MEDIA_BUCKET).remove([path]) }

  const [{ count }, { data: last }] = await Promise.all([
    supabase.from('media').select('id', { count: 'exact', head: true }).eq(owner.column, params.ownerId),
    supabase.from('media').select('sort_order').eq(owner.column, params.ownerId)
      .order('sort_order', { ascending: false }).limit(1),
  ])

  if ((count ?? 0) >= MAX_MEDIA_PER_TALENT) {
    await discard()
    return NextResponse.json(
      { error: `This record already has ${MAX_MEDIA_PER_TALENT} items. Remove one before adding another.` },
      { status: 409 },
    )
  }

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  const isFirst = (count ?? 0) === 0

  const { data, error } = await supabase
    .from('media')
    .insert({
      [owner.column]: params.ownerId,
      url:            pub.publicUrl,
      storage_path:   path,
      kind,
      caption:        caption ?? null,
      sort_order:     (last?.[0]?.sort_order ?? -1) + 1,
      // First photo becomes the thumbnail, so a new record isn't left blank.
      is_primary:     isFirst && kind === 'PHOTO',
    })
    .select()
    .single()

  if (error) {
    await discard()
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Talent carry their thumbnail on the record itself, for list views that
  // don't join media.
  if (data.is_primary && owner.type === 'talent') {
    await supabase.from('talent').update({ avatar: data.url }).eq('id', params.ownerId)
  }

  return NextResponse.json(toCamel(data), { status: 201 })
}
