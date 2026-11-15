import type { UploadAuthorization } from './api/types'

export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CloudinaryUploadError'
  }
}

interface CloudinaryUploadResponse {
  public_id?: unknown
  secure_url?: unknown
  error?: { message?: unknown }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as CloudinaryUploadResponse
    const message = body.error?.message

    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  } catch {
    // Fall through to the status-based message.
  }

  return `Cloudinary rejected the upload (status ${String(response.status)}).`
}

/**
 * Sends the bytes straight to Cloudinary with the server-issued signature.
 *
 * The API never proxies image bytes, and the client never chooses the asset
 * identifier: `public_id` comes from the server authorization and is checked
 * again when the photo is registered. No Authorization header or archive
 * cookie is sent to Cloudinary.
 */
export async function uploadImageToCloudinary(
  file: File,
  authorization: UploadAuthorization,
): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', authorization.apiKey)
  form.append('timestamp', String(authorization.timestamp))
  form.append('signature', authorization.signature)
  form.append('public_id', authorization.publicId)
  form.append('upload_preset', authorization.uploadPreset)

  let response: Response

  try {
    response = await fetch(authorization.uploadUrl, {
      method: 'POST',
      body: form,
      credentials: 'omit',
    })
  } catch {
    throw new CloudinaryUploadError(
      'The image host could not be reached. Check your connection and try again.',
    )
  }

  if (!response.ok) {
    throw new CloudinaryUploadError(await errorMessage(response))
  }

  const body = (await response.json()) as CloudinaryUploadResponse

  if (body.public_id !== authorization.publicId) {
    throw new CloudinaryUploadError(
      'The image host returned an unexpected asset identifier.',
    )
  }

  return authorization.publicId
}
