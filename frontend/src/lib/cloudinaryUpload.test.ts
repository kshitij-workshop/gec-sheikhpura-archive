import { describe, expect, it, vi } from 'vitest'

import { makeUploadAuthorization } from '../test/archiveFixtures'
import { jsonResponse } from '../test/fetchStub'
import { CloudinaryUploadError, uploadImageToCloudinary } from './cloudinaryUpload'

function photoFile(): File {
  return new File([new Uint8Array(64)], 'sports-day.jpg', {
    type: 'image/jpeg',
  })
}

describe('uploadImageToCloudinary', () => {
  it('posts the signed fields without archive credentials', async () => {
    const authorization = makeUploadAuthorization()
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock.mockResolvedValue(
      jsonResponse({ public_id: authorization.publicId }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const publicId = await uploadImageToCloudinary(photoFile(), authorization)

    expect(publicId).toBe(authorization.publicId)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const call = fetchMock.mock.calls[0]
    if (call === undefined) {
      throw new Error('Expected the image host to be called')
    }
    const [url, init] = call
    if (init === undefined) {
      throw new Error('Expected request options')
    }
    expect(url).toBe(authorization.uploadUrl)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    expect(init.headers).toBeUndefined()

    const body = init.body as FormData
    expect(body.get('api_key')).toBe(authorization.apiKey)
    expect(body.get('signature')).toBe(authorization.signature)
    expect(body.get('public_id')).toBe(authorization.publicId)
    expect(body.get('upload_preset')).toBe(authorization.uploadPreset)
  })

  it('rejects an asset identifier the server did not authorize', async () => {
    const authorization = makeUploadAuthorization()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ public_id: 'other/asset' }))),
    )

    await expect(
      uploadImageToCloudinary(photoFile(), authorization),
    ).rejects.toBeInstanceOf(CloudinaryUploadError)
  })

  it('surfaces the image host error message', async () => {
    const authorization = makeUploadAuthorization()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ error: { message: 'Invalid signature' } }, 400),
        ),
      ),
    )

    await expect(
      uploadImageToCloudinary(photoFile(), authorization),
    ).rejects.toThrow('Invalid signature')
  })

  it('reports a network failure without pretending the upload worked', async () => {
    const authorization = makeUploadAuthorization()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    await expect(
      uploadImageToCloudinary(photoFile(), authorization),
    ).rejects.toThrow(/could not be reached/)
  })
})
