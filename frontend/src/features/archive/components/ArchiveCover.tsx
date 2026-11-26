import type {
  AlbumSummary,
  ArchiveEvent,
  PublicPhoto,
} from '../../../lib/api/types'
import { useAlbumPreview } from '../queries'
import { PhotoImage } from './PhotoImage'

interface CoverOptions {
  width: number
  height: number
  className?: string
  eager?: boolean
}

function CoverPlaceholder({
  className,
  label = 'Photograph coming soon',
}: {
  className?: string
  label?: string
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={[
        'flex items-center justify-center overflow-hidden bg-archive-surface',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-col items-center gap-3 text-archive-muted/70">
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          className="h-8 w-8"
        >
          <rect x="6" y="10" width="36" height="28" rx="1" />
          <circle cx="18" cy="20" r="3.5" />
          <path d="M6 32l9-9 7 7 6-6 14 14" />
        </svg>
        <span className="text-[10px] uppercase tracking-[0.16em]">
          No photos yet
        </span>
      </div>
    </div>
  )
}

function AlbumCoverPreview({
  album,
  width,
  height,
  className,
  eager,
}: CoverOptions & { album: AlbumSummary }) {
  const preview = useAlbumPreview(album.slug)
  const photo = preview.data?.photos?.items?.[0]

  if (!photo) {
    return <CoverPlaceholder className={className} />
  }

  return (
    <PhotoImage
      photo={photo}
      width={width}
      height={height}
      crop="fill"
      className={className}
      eager={eager}
    />
  )
}

export function AlbumCover({
  album,
  photo,
  ...options
}: CoverOptions & { album: AlbumSummary; photo?: PublicPhoto }) {
  if (photo) {
    return (
      <PhotoImage
        photo={photo}
        width={options.width}
        height={options.height}
        crop="fill"
        className={options.className}
        eager={options.eager}
      />
    )
  }

  return <AlbumCoverPreview album={album} {...options} />
}

export function EventCover({
  event,
  photo,
  ...options
}: CoverOptions & { event: ArchiveEvent; photo?: PublicPhoto }) {
  if (photo) {
    return (
      <PhotoImage
        photo={photo}
        width={options.width}
        height={options.height}
        crop="fill"
        className={options.className}
        eager={options.eager}
      />
    )
  }

  const album = event.albums[0]

  if (!album) {
    return <CoverPlaceholder className={options.className} />
  }

  return <AlbumCoverPreview album={album} {...options} />
}
