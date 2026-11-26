import { Link } from 'react-router'

import type {
  AlbumSummary,
  ArchiveEvent,
  PublicPhoto,
} from '../../../lib/api/types'
import { AlbumCover } from './ArchiveCover'

export interface AlbumCardProps {
  album: AlbumSummary
  event: ArchiveEvent
  /** A real approved photograph for the album, when one is available. */
  cover?: PublicPhoto
}

/** Photo-first album card used on an event page. */
export function AlbumCard({ album, event, cover }: AlbumCardProps) {
  return (
    <article className="group flex h-full flex-col border border-archive-line bg-archive-surface/30 transition-colors duration-300 hover:border-archive-accent/60">
      <Link
        to={`/albums/${album.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block overflow-hidden bg-archive-surface"
      >
        <AlbumCover
          album={album}
          photo={cover}
          width={800}
          height={600}
          className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-xl font-normal leading-snug tracking-tight text-archive-ink">
          <Link
            to={`/albums/${album.slug}`}
            className="transition-colors hover:text-archive-accent"
          >
            {album.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <Link
            to={`/albums/${album.slug}`}
            className="text-[10px] uppercase tracking-[0.16em] text-archive-muted transition-colors hover:text-archive-ink"
          >
            View album
          </Link>
          <Link
            to={`/contribute?event=${event.id}&album=${album.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-archive-accent transition-colors hover:text-archive-ink"
          >
            <span aria-hidden="true">+</span> Add photos
          </Link>
        </div>
      </div>
    </article>
  )
}
