'use client'

import { VIDEO_TYPES } from '@/lib/media'

/**
 * Images at or above this get flagged before upload and offered for
 * compression. Deliberately well below the 15 MB hard limit: a portfolio shot
 * displayed at a few hundred pixels has nothing to gain from a 12 MB original,
 * and the saving compounds across 10 items per talent.
 */
export const COMPRESS_THRESHOLD_BYTES = 2 * 1024 * 1024 // 2 MB

/** Longest edge after downscaling. Comfortably above comp-card and retina needs. */
export const MAX_EDGE_PX = 2560

const QUALITY = 0.82

export interface CompressionResult {
  /** The compressed file, or the original when compression didn't help. */
  file: File
  /** Always the untouched input, so the user can choose to upload it as-is. */
  originalFile: File
  originalBytes: number
  bytes: number
  /** Original pixel dimensions, kept so the UI can say what actually changed. */
  fromWidth: number
  fromHeight: number
  toWidth: number
  toHeight: number
  /** False when re-encoding made no worthwhile difference and the original is kept. */
  changed: boolean
}

export function needsReview(file: File): boolean {
  if ((VIDEO_TYPES as readonly string[]).includes(file.type)) return false
  return file.size >= COMPRESS_THRESHOLD_BYTES
}

export function savingsPercent(r: CompressionResult): number {
  if (!r.originalBytes) return 0
  return Math.max(0, Math.round((1 - r.bytes / r.originalBytes) * 100))
}

/**
 * Re-encodes an image to WebP, downscaling it if its longest edge exceeds
 * MAX_EDGE_PX. WebP rather than JPEG so PNGs with transparency survive.
 *
 * Returns the original untouched if compression didn't actually help — some
 * files are already well-optimised, and shipping a larger "compressed" version
 * would be worse than doing nothing.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const unchanged = (w = 0, h = 0): CompressionResult => ({
    file,
    originalFile: file,
    originalBytes: file.size,
    bytes: file.size,
    fromWidth: w, fromHeight: h, toWidth: w, toHeight: h,
    changed: false,
  })

  let bitmap: ImageBitmap
  try {
    // from-image applies the EXIF orientation, so a phone photo doesn't come
    // out of the canvas rotated.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return unchanged()
  }

  const { width, height } = bitmap
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close(); return unchanged(width, height) }

  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob: Blob | null = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  )
  if (!blob || blob.size >= file.size) return unchanged(width, height)

  const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
  return {
    file: new File([blob], name, { type: 'image/webp', lastModified: Date.now() }),
    originalFile: file,
    originalBytes: file.size,
    bytes: blob.size,
    fromWidth: width, fromHeight: height,
    toWidth: w, toHeight: h,
    changed: true,
  }
}
