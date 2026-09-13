/**
 * Shared rules for talent portfolio media. Imported by both the API routes and
 * the upload UI so the limits shown to the user are the same ones enforced.
 */

export const MEDIA_BUCKET = 'talent-media'

/** Hard cap per talent. Also enforced by a trigger in supabase/schema.sql. */
export const MAX_MEDIA_PER_TALENT = 10

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export const ACCEPTED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES]

/** Accept attribute for the file picker. */
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024   // 15 MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024  // 200 MB

export type MediaKind = 'PHOTO' | 'VIDEO'

export function kindFor(contentType: string): MediaKind | null {
  if ((IMAGE_TYPES as readonly string[]).includes(contentType)) return 'PHOTO'
  if ((VIDEO_TYPES as readonly string[]).includes(contentType)) return 'VIDEO'
  return null
}

export function maxBytesFor(kind: MediaKind): number {
  return kind === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / 1024)} KB`
}

/**
 * Object key for an upload. Prefixed by talent so a bucket listing is browsable,
 * and randomised so re-uploading the same filename never overwrites an earlier
 * file that another row still points at.
 */
export function storageKey(talentId: string, filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase().slice(0, 8) : 'bin'
  const rand = globalThis.crypto.randomUUID()
  return `${talentId}/${Date.now()}-${rand}.${ext}`
}
