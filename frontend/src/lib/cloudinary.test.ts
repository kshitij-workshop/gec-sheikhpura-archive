import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloudinaryImageUrl } from './cloudinary'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('cloudinaryImageUrl', () => {
  it('builds an optimized delivery URL with a crop box', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'gecs-demo')

    expect(
      cloudinaryImageUrl('gecs/opening day', 'JPG', {
        width: 480,
        height: 360,
        crop: 'fill',
      }),
    ).toBe(
      'https://res.cloudinary.com/gecs-demo/image/upload/f_auto,q_auto,w_480,h_360,c_fill/gecs/opening%20day.jpg',
    )
  })

  it('defaults to a no-upscale transform and omits crop when unsized', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'gecs-demo')

    expect(cloudinaryImageUrl('gecs/founders', 'webp', { width: 1600 })).toBe(
      'https://res.cloudinary.com/gecs-demo/image/upload/f_auto,q_auto,w_1600,c_limit/gecs/founders.webp',
    )
    expect(cloudinaryImageUrl('gecs/founders', 'jpg')).toBe(
      'https://res.cloudinary.com/gecs-demo/image/upload/f_auto,q_auto/gecs/founders.jpg',
    )
  })

  it('returns null when the cloud name is missing or invalid', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '')
    expect(cloudinaryImageUrl('gecs/founders', 'jpg')).toBeNull()

    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'not a cloud')
    expect(cloudinaryImageUrl('gecs/founders', 'jpg')).toBeNull()
  })

  it('returns null for an empty public id or format', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'gecs-demo')

    expect(cloudinaryImageUrl('  ', 'jpg')).toBeNull()
    expect(cloudinaryImageUrl('gecs/founders', '')).toBeNull()
  })
})
