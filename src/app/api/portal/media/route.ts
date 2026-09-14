export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase, toCamel } from '@/lib/supabase'
import { requireAccount } from '@/lib/apiAuth'
import { MEDIA_BUCKET, MAX_MEDIA_PER_TALENT, type MediaKind } from '@/lib/media'

const ownerColumnFor = (t: 'TALENT' | 'SUPPLIER') => (t === 'TALENT' ? 'talent_id' : 'supplier_id')

export async function GET() {
  const auth = await requireAccount()
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq(ownerColumnFor(auth.accountType), auth.accountId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toCamel(data ?? []))
}

/** Records an upload the browser has already PUT to the signed URL. */
export async function POST(req: NextRequest) {
  const auth = await requireAccount()
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

  // The signed URL was scoped to this member's prefix; refuse a path that
  // claims to belong anywhere else.
  const ownerType = auth.accountType === 'TALENT' ? 'talent' : 'supplier'
  if (!path.startsWith(`${ownerType}/${auth.accountId}/`)) {
    return NextResponse.json({ error: 'That upload does not belong to your account' }, { status: 400 })
  }

  const column = ownerColumnFor(auth.accountType)
  const discard = async () => { await supabase.storage.from(MEDIA_BUCKET).remove([path]) }

  const [{ count }, { data: last }] = await Promise.all([
    supabase.from('media').select('id', { count: 'exact', head: true }).eq(column, auth.accountId),
    supabase.from('media').select('sort_order').eq(column, auth.accountId)
      .order('sort_order', { ascending: false }).limit(1),
  ])

  if ((count ?? 0) >= MAX_MEDIA_PER_TALENT) {
    await discard()
    return NextResponse.json(
      { error: `You already have ${MAX_MEDIA_PER_TALENT} items. Remove one before adding another.` },
      { status: 409 },
    )
  }

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  const isFirst = (count ?? 0) === 0

  const { data, error } = await supabase
    .from('media')
    .insert({
      [column]:     auth.accountId,
      url:          pub.publicUrl,
      storage_path: path,
      kind,
      caption:      caption ?? null,
      sort_order:   (last?.[0]?.sort_order ?? -1) + 1,
      is_primary:   isFirst && kind === 'PHOTO',
    })
    .select()
    .single()

  if (error) {
    await discard()
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (data.is_primary && auth.accountType === 'TALENT') {
    await supabase.from('talent').update({ avatar: data.url }).eq('id', auth.accountId)
  }

  return NextResponse.json(toCamel(data), { status: 201 })
}
