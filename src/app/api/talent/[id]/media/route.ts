export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import { MEDIA_BUCKET, MAX_MEDIA_PER_TALENT, type MediaKind } from '@/lib/media'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('VIEWER')
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('talent_media')
    .select('*')
    .eq('talent_id', params.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data ?? []))
}

/**
 * Records an upload that has already landed in storage. Called by the browser
 * after it PUTs the file to the signed URL from ../media/sign.
 *
 * If the row can't be written, the just-uploaded object is deleted rather than
 * left behind — an orphaned file still counts against storage but is invisible
 * to the app, so it would never get cleaned up by anything else.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

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
  // The signed URL was scoped to this talent's prefix; refuse a path that claims
  // to belong to someone else.
  if (!path.startsWith(`${params.id}/`)) {
    return NextResponse.json({ error: 'That upload does not belong to this talent' }, { status: 400 })
  }

  const discard = async () => {
    await supabase.storage.from(MEDIA_BUCKET).remove([path])
  }

  const [{ count }, { data: existing }] = await Promise.all([
    supabase.from('talent_media').select('id', { count: 'exact', head: true }).eq('talent_id', params.id),
    supabase.from('talent_media').select('id, sort_order').eq('talent_id', params.id).order('sort_order', { ascending: false }).limit(1),
  ])

  if ((count ?? 0) >= MAX_MEDIA_PER_TALENT) {
    await discard()
    return NextResponse.json(
      { error: `This talent already has ${MAX_MEDIA_PER_TALENT} items. Remove one before adding another.` },
      { status: 409 },
    )
  }

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  const isFirst = (count ?? 0) === 0

  const { data, error } = await supabase
    .from('talent_media')
    .insert({
      talent_id:    params.id,
      url:          pub.publicUrl,
      storage_path: path,
      kind,
      caption:      caption ?? null,
      sort_order:   (existing?.[0]?.sort_order ?? -1) + 1,
      // First photo becomes the profile shot, so a new talent isn't left blank.
      is_primary:   isFirst && kind === 'PHOTO',
    })
    .select()
    .single()

  if (error) {
    await discard()
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (data.is_primary) {
    await supabase.from('talent').update({ avatar: data.url }).eq('id', params.id)
  }

  return NextResponse.json(toCamel(data), { status: 201 })
}
