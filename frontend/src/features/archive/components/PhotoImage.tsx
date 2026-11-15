import { cloudinaryImageUrl } from '../../../lib/cloudinary'
import type { ImageTransform } from '../../../lib/cloudinary'
import type { PublicPhoto } from '../../../lib/api/types'
import { photoAltText } from '../../../lib/format'

export interface PhotoImageProps extends ImageTransform {
  photo: PublicPhoto
  className?: string
  /** Above-the-fold images should load eagerly. */
  eager?: boolean
}

/**
 * Renders a photograph through Cloudinary's delivery network. Public DTOs do
 * not carry URLs, so the client builds one from the public cloud name.
 */
export function PhotoImage({
  photo,
  width,
  height,
  crop,
  className,
  eager = false,
}: PhotoImageProps) {
  const alt = photoAltText(photo)
  const src = cloudinaryImageUrl(photo.cloudinaryPublicId, photo.format, {
    width,
    height,
    crop,
  })

  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={[
          'flex items-center justify-center bg-stone-100 p-4 text-center text-xs text-archive-muted',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        Image delivery is not configured for this deployment.
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  )
}
