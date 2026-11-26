import { useEffect, useId, useRef } from 'react'

import { Button } from '../../../components/ui'
import type { PublicPhoto } from '../../../lib/api/types'
import { formatCredits, formatTimestamp } from '../../../lib/format'
import { PhotoActions } from './PhotoActions'
import { PhotoImage } from './PhotoImage'
import { AdminPhotoMenu } from '../../admin/AdminPhotoMenu'

export interface PhotoViewerProps {
  photos: PublicPhoto[]
  /** Index of the open photograph, or `null` when the viewer is closed. */
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}

/**
 * Modal photograph viewer built on the native `<dialog>` element so the
 * browser handles focus trapping, Escape, and focus restoration. Arrow keys
 * move between photographs; buttons expose the same actions.
 */
export function PhotoViewer({
  photos,
  index,
  onClose,
  onNavigate,
}: PhotoViewerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const open = index !== null
  const photo = index === null ? undefined : photos[index]

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }

    if (open) {
      if (dialog.open) {
        return
      }
      if (typeof dialog.showModal === 'function') {
        try {
          dialog.showModal()
          return
        } catch {
          // Fall through to the attribute-based fallback.
        }
      }
      dialog.setAttribute('open', '')
      return
    }

    if (!dialog.open) {
      return
    }
    if (typeof dialog.close === 'function') {
      dialog.close()
    } else {
      dialog.removeAttribute('open')
    }
  }, [open])

  const currentIndex = index ?? 0
  const hasPrevious = index !== null && index > 0
  const hasNext = index !== null && index < photos.length - 1

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        // Controls inside a nested dialog (report, removal) must not navigate
        // or close the viewer: stop once the event leaves the viewer itself.
        const origin =
          event.target instanceof Element
            ? event.target.closest('dialog')
            : null
        if (origin !== null && origin !== ref.current) {
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
          return
        }
        if (event.key === 'ArrowLeft' && hasPrevious) {
          event.preventDefault()
          onNavigate(currentIndex - 1)
        }
        if (event.key === 'ArrowRight' && hasNext) {
          event.preventDefault()
          onNavigate(currentIndex + 1)
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      className="w-[min(96rem,calc(100vw-1rem))] border border-archive-line bg-[#0b0b0b] p-0 text-archive-ink shadow-2xl backdrop:bg-black/85"
    >
      {photo ? (
        <div className="flex max-h-[94vh] flex-col lg:grid lg:max-h-[90vh] lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p
                aria-live="polite"
                className="text-[11px] uppercase tracking-[0.22em] text-archive-muted"
              >
                {currentIndex + 1} of {photos.length}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close photograph"
                className="flex h-9 w-9 items-center justify-center border border-archive-line text-archive-muted transition-colors hover:border-archive-accent hover:text-archive-accent"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black px-2 pb-3 sm:px-6 sm:pb-6">
              <PhotoImage
                photo={photo}
                width={2000}
                className="max-h-[58vh] w-auto max-w-full object-contain lg:max-h-[76vh]"
                eager
              />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-archive-line px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasPrevious) {
                    onNavigate(currentIndex - 1)
                  }
                }}
                disabled={!hasPrevious}
              >
                <span aria-hidden="true">←</span> Previous
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasNext) {
                    onNavigate(currentIndex + 1)
                  }
                }}
                disabled={!hasNext}
              >
                Next <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>

          <aside className="min-h-0 space-y-5 overflow-y-auto border-t border-archive-line p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="space-y-2">
              <p className="eyebrow text-archive-accent">Photograph</p>
              <h2
                id={titleId}
                className="font-serif text-2xl font-normal leading-tight tracking-tight"
              >
                {photo.title?.trim() || 'Untitled photograph'}
              </h2>
              {photo.caption ? (
                <p className="text-sm leading-relaxed text-archive-muted">
                  {photo.caption}
                </p>
              ) : null}
            </div>

            <dl className="space-y-3 border-t border-archive-line pt-4 text-sm">
              <div className="space-y-1">
                <dt className="eyebrow text-archive-muted">Photograph by</dt>
                <dd className="text-archive-ink">
                  {formatCredits(
                    photo.photographers.map((credit) => credit.creditName),
                  )}
                </dd>
              </div>
              {photo.takenAt ? (
                <div className="space-y-1">
                  <dt className="eyebrow text-archive-muted">Taken</dt>
                  <dd className="text-archive-ink">
                    {formatTimestamp(photo.takenAt)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="space-y-3 border-t border-archive-line pt-4">
              <PhotoActions key={photo.id} photo={photo} />
              <AdminPhotoMenu
                photoId={photo.id}
                photoTitle={photo.title}
              />
            </div>

            <p className="border-t border-archive-line pt-4 text-[11px] leading-relaxed text-archive-muted">
              Use the arrow keys to move between photographs. Press Escape to
              close.
            </p>
          </aside>
        </div>
      ) : null}
    </dialog>
  )
}
