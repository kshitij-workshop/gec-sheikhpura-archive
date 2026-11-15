export interface ImageTransform {
  /** Target width in CSS pixels. */
  width?: number
  /** Target height in CSS pixels. Omit to preserve the source ratio. */
  height?: number
  /** `limit` never upscales; `fill` crops to the requested box. */
  crop?: 'limit' | 'fill'
}

/** Cloudinary cloud names are alphanumeric, dashes, and underscores. */
const CLOUD_NAME = /^[a-zA-Z0-9_-]+$/

function cloudName(): string | null {
  const value = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim()
  return value && CLOUD_NAME.test(value) ? value : null
}

/**
 * Builds a Cloudinary delivery URL for a public photo.
 *
 * Only published photographs reach this helper, and the server remains the
 * source of truth for visibility. Returns `null` when the deployment has no
 * usable cloud name so callers can show a placeholder instead of a broken
 * image request.
 */
export function cloudinaryImageUrl(
  publicId: string,
  format: string,
  transform: ImageTransform = {},
): string | null {
  const cloud = cloudName()
  const cleanId = publicId.trim().replace(/^\/+/, '')
  const cleanFormat = format.trim().toLowerCase()

  if (!cloud || cleanId.length === 0 || cleanFormat.length === 0) {
    return null
  }

  const parts = ['f_auto', 'q_auto']
  if (transform.width) {
    parts.push(`w_${String(Math.round(transform.width))}`)
  }
  if (transform.height) {
    parts.push(`h_${String(Math.round(transform.height))}`)
  }
  if (transform.width || transform.height) {
    parts.push(`c_${transform.crop ?? 'limit'}`)
  }

  const encodedId = cleanId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `https://res.cloudinary.com/${cloud}/image/upload/${parts.join(',')}/${encodedId}.${encodeURIComponent(cleanFormat)}`
}
