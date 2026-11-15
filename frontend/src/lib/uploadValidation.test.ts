import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MAX_FILE_SIZE_BYTES,
  fileExtension,
  fileProblem,
  formatBytes,
} from './uploadValidation'

function fileOf(
  name: string,
  type: string,
  bytes: number,
): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('uploadValidation', () => {
  it('reads extensions and formats byte sizes', () => {
    expect(fileExtension('Sports-Day.JPG')).toBe('jpg')
    expect(fileExtension('no-extension')).toBe('')
    expect(formatBytes(900)).toBe('900 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('accepts supported images within the size limit', () => {
    expect(
      fileProblem(fileOf('photo.jpg', 'image/jpeg', 1024)),
    ).toBeNull()
    expect(
      fileProblem(fileOf('photo.webp', 'image/webp', 1024)),
    ).toBeNull()
  })

  it('rejects unsupported formats and mismatched MIME types', () => {
    expect(fileProblem(fileOf('photo.gif', 'image/gif', 1024))).toMatch(
      /Unsupported format/,
    )
    expect(fileProblem(fileOf('photo.jpg', 'text/plain', 1024))).toMatch(
      /not a JPEG/,
    )
  })

  it('rejects empty and oversized files', () => {
    expect(fileProblem(fileOf('photo.jpg', 'image/jpeg', 0))).toMatch(
      /empty/,
    )
    expect(
      fileProblem(fileOf('photo.jpg', 'image/jpeg', 11), {
        maxFileSizeBytes: 10,
      }),
    ).toMatch(/limit is 10 B/)
  })

  it('uses the documented default limit', () => {
    expect(DEFAULT_MAX_FILE_SIZE_BYTES).toBe(15 * 1024 * 1024)
  })
})
