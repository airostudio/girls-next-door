export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/apiAuth'
import {
  MEDIA_BUCKET, MAX_MEDIA_PER_TALENT, kindFor, maxBytesFor, formatBytes, storageKey,
} from '@/lib/media'
import { resolveOwner } from '../_shared'

type Ctx = { params: { ownerType: string; ownerId: string } }

/**
 * Authorises one upload and returns a signed URL the browser can PUT the file to.
 *
 * The file never passes through this route: serverless request bodies are capped
 * at a few MB, which any real video would blow straight through. Instead the
 * server does the deciding — role check, owner check, file type, size, and the
 * 10-item cap — and hands back a single-use URL scoped to one object key.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole('MANAGER')
  if (!auth.ok) return auth.response

  const owner = await resolveOwner(params.ownerType, params.ownerId)
  if (!owner.ok) return owner.response

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
    .eq(owner.column, params.ownerId)

  if ((count ?? 0) >= MAX_MEDIA_PER_TALENT) {
    return NextResponse.json(
      { error: `This record already has ${MAX_MEDIA_PER_TALENT} items. Remove one before adding another.` },
      { status: 409 },
    )
  }

  const path = storageKey(owner.type, params.ownerId, filename)
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not start the upload' }, { status: 500 })
  }

  return NextResponse.json({ path: data.path, token: data.token, kind })
}
