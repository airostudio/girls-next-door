'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Star, Trash2, Film, Loader2, AlertCircle } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import {
  ACCEPT_ATTR, MAX_MEDIA_PER_TALENT, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES,
  formatBytes, kindFor,
} from '@/lib/media'

interface MediaItem {
  id: string
  url: string
  kind: 'PHOTO' | 'VIDEO'
  caption: string | null
  sortOrder: number
  isPrimary: boolean
}

interface Props { talentId: string; canEdit: boolean }

export default function MediaGallery({ talentId, canEdit }: Props) {
  const [items,    setItems]    = useState<MediaItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState(0)      // uploads in flight
  const [error,    setError]    = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_MEDIA_PER_TALENT - items.length
  const full = remaining <= 0

  const load = useCallback(async () => {
    const res = await fetch(`/api/talent/${talentId}/media`)
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [talentId])

  useEffect(() => { load() }, [load])

  /**
   * Per file: ask the server to authorise the upload, PUT the bytes straight to
   * storage with the signed URL it returns, then record the row. The file never
   * goes through our own API — serverless bodies cap out well below video size.
   */
  async function uploadOne(file: File) {
    const kind = kindFor(file.type)
    if (!kind) throw new Error(`${file.name} isn't a supported file type.`)

    const sign = await fetch(`/api/talent/${talentId}/media/sign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    })
    const signed = await sign.json()
    if (!sign.ok) throw new Error(signed.error ?? 'Upload was refused')

    const { error: upErr } = await getBrowserSupabase()
      .storage.from('talent-media')
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type })
    if (upErr) throw new Error(`${file.name} failed to upload: ${upErr.message}`)

    const confirm = await fetch(`/api/talent/${talentId}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: signed.path, kind: signed.kind }),
    })
    const saved = await confirm.json()
    if (!confirm.ok) throw new Error(saved.error ?? 'Could not save the upload')
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setError('')

    const files = Array.from(fileList)
    if (files.length > remaining) {
      setError(`Only ${remaining} slot${remaining === 1 ? '' : 's'} left — ${files.length} files selected.`)
      return
    }

    setBusy(files.length)
    for (const file of files) {
      try {
        await uploadOne(file)
      } catch (e: any) {
        setError(e.message ?? 'Upload failed')
      } finally {
        setBusy(n => n - 1)
      }
    }
    await load()
  }

  async function setPrimary(id: string) {
    await fetch(`/api/talent/${talentId}/media/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    })
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/talent/${talentId}/media/${id}`, { method: 'DELETE' })
    setItems(list => list.filter(i => i.id !== id))
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="section-title mb-0">Portfolio</h3>
        <span className="text-xs text-stone-500 tabular-nums">
          {items.length} / {MAX_MEDIA_PER_TALENT} items
        </span>
      </div>

      {canEdit && (
        <div
          onDragOver={e => { e.preventDefault(); if (!full) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (!full) handleFiles(e.dataTransfer.files) }}
          onClick={() => !full && inputRef.current?.click()}
          className={[
            'rounded-xl border border-dashed px-5 py-7 text-center transition-colors mb-5',
            full
              ? 'border-surface-border bg-surface-muted/30 cursor-not-allowed'
              : 'cursor-pointer ' + (dragging
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-border hover:border-brand-600 hover:bg-surface-muted/40'),
          ].join(' ')}
        >
          <input
            id={`media-upload-${talentId}`}
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
          />
          {busy > 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading {busy} file{busy === 1 ? '' : 's'}…
            </div>
          ) : full ? (
            <p className="text-sm text-stone-500">
              Portfolio is full — remove an item to add another.
            </p>
          ) : (
            <>
              <Upload className="w-5 h-5 mx-auto mb-2 text-stone-500" />
              <p className="text-sm text-stone-300">
                Drop photos or videos here, or <span className="text-brand-400">browse</span>
              </p>
              <p className="text-[11px] text-stone-600 mt-1.5">
                JPEG, PNG, WebP, AVIF up to {formatBytes(MAX_IMAGE_BYTES)} · MP4, WebM, MOV up to {formatBytes(MAX_VIDEO_BYTES)}
                {' · '}{remaining} slot{remaining === 1 ? '' : 's'} left
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-stone-500 py-6 text-center">Loading portfolio…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500 py-6 text-center">
          No photos or videos yet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 list-none p-0 m-0">
          {items.map(item => (
            <li key={item.id} className="relative group rounded-lg overflow-hidden border border-surface-border bg-surface">
              <div className="aspect-[3/4] max-w-full bg-surface-muted">
                {item.kind === 'VIDEO' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  // Uploaded files come from a user-configured Supabase bucket, so
                  // they skip next/image optimisation and its host allow-list.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.caption ?? ''} loading="lazy" className="w-full h-full object-cover" />
                )}
              </div>

              {item.kind === 'VIDEO' && (
                <span className="absolute top-1.5 left-1.5 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] text-stone-200">
                  <Film className="w-3 h-3" /> Video
                </span>
              )}
              {item.isPrimary && (
                <span className="absolute top-1.5 right-1.5 bg-brand-500 text-black rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Profile
                </span>
              )}

              {canEdit && (
                <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {item.kind === 'PHOTO' && !item.isPrimary && (
                    <button
                      onClick={() => setPrimary(item.id)}
                      title="Use as profile shot"
                      className="flex-1 bg-black/80 hover:bg-black text-stone-200 py-1.5 flex items-center justify-center"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(item.id)}
                    title="Remove"
                    className="flex-1 bg-black/80 hover:bg-red-900/90 text-red-300 py-1.5 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
