/**
 * Upload pre-checks. The server verifies the real asset through Cloudinary
 * before any photo record exists, so these checks only prevent obviously
 * wasted requests.
 */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
export const DEFAULT_ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const
export const MAX_PHOTOS_PER_SUBMISSION = 50

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export interface FileLimits {
  maxFileSizeBytes?: number
  allowedFormats?: readonly string[]
}

export function fileExtension(name: string): string {
  const index = name.lastIndexOf('.')

  return index >= 0 ? name.slice(index + 1).toLowerCase() : ''
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Returns a problem message for a file that cannot be submitted, or `null`.
 * Formats are compared case-insensitively; MIME types are checked when the
 * browser reports one.
 */
export function fileProblem(file: File, limits: FileLimits = {}): string | null {
  const maxBytes = limits.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES
  const formats = (limits.allowedFormats ?? DEFAULT_ALLOWED_FORMATS).map(
    (format) => format.toLowerCase(),
  )

  const extension = fileExtension(file.name)

  if (!formats.includes(extension)) {
    return `Unsupported format. Use ${formats.join(', ')}.`
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return 'This file is not a JPEG, PNG, or WebP image.'
  }
  if (file.size <= 0) {
    return 'This file is empty.'
  }
  if (file.size > maxBytes) {
    return `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`
  }

  return null
}
