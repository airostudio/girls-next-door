export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAccount } from '@/lib/apiAuth'
import {
  MEDIA_BUCKET, MAX_MEDIA_PER_TALENT, kindFor, maxBytesFor, formatBytes, storageKey,
} from '@/lib/media'

/** Owner column on `media` for the caller's account type. */
const ownerColumnFor = (t: 'TALENT' | 'SUPPLIER') => (t === 'TALENT' ? 'talent_id' : 'supplier_id')

/**
 * Authorises one upload for the signed-in member's own record.
 *
 * Identical in spirit to the staff route, with one difference that matters: the
 * owner is taken from the session, so a member can only ever obtain a signed URL
 * scoped to their own storage prefix.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAccount()
  if (!auth.ok) return auth.response

  let body: { filename?: string; contentType?: string; size?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { filename, contentType, size } = body
  if (!filename || !contentType || typeof size !== 'number') {
    return NextResponse.json({ error: 'filename, contentType and size are required' }, { status: 400 })
  }

  const kind = kindFor(contentType)
  if (!kind) {
    return NextResponse.json(
      { error: `${contentType} isn't a supported file type. Use JPEG, PNG, WebP, AVIF, MP4, WebM or MOV.` },
      { status: 400 },
    )
  }

  const limit = maxBytesFor(kind)
  if (size > limit) {
    return NextResponse.json(
      { error: `That file is ${formatBytes(size)}. The limit for ${kind === 'VIDEO' ? 'videos' : 'images'} is ${formatBytes(limit)}.` },
      { status: 400 },
    )
  }

  const { count } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .eq(ownerColumnFor(auth.accountType), auth.accountId)

  if ((count ?? 0) >= MAX_MEDIA_PER_TALENT) {
    return NextResponse.json(
      { error: `You already have ${MAX_MEDIA_PER_TALENT} items. Remove one before adding another.` },
      { status: 409 },
    )
  }

  const ownerType = auth.accountType === 'TALENT' ? 'talent' : 'supplier'
  const path = storageKey(ownerType, auth.accountId, filename)
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not start the upload' }, { status: 500 })
  }

  return NextResponse.json({ path: data.path, token: data.token, kind })
}
