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
      className="w-[min(72rem,calc(100vw-2rem))] rounded-xl border border-archive-line bg-archive-paper p-0 text-archive-ink shadow-2xl backdrop:bg-stone-900/70"
    >
      {photo ? (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-archive-line px-5 py-3">
            <div className="space-y-0.5">
              <h2
                id={titleId}
                className="font-serif text-lg font-semibold tracking-tight"
              >
                {photo.title?.trim() || 'Untitled photograph'}
              </h2>
              <p aria-live="polite" className="text-xs text-archive-muted">
                {currentIndex + 1} of {photos.length}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close photograph"
              className="rounded p-1 text-archive-muted transition-colors hover:bg-stone-100 hover:text-archive-ink"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-stone-950/95 p-4 sm:p-6">
            <div className="mx-auto w-fit max-w-full rounded-sm border border-stone-800/60 bg-archive-paper p-3 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
              <PhotoImage
                photo={photo}
                width={1600}
                className="mx-auto max-h-[62vh] w-auto max-w-full object-contain"
                eager
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-archive-line px-5 py-4">
            {photo.caption ? (
              <p className="font-serif text-sm leading-relaxed text-archive-ink">
                {photo.caption}
              </p>
            ) : null}
            <p className="text-xs text-archive-muted">
              <span className="font-medium text-archive-ink">
                Photograph by{' '}
              </span>
              {formatCredits(photo.photographers.map((credit) => credit.creditName))}
              {photo.takenAt ? ` · Taken ${formatTimestamp(photo.takenAt)}` : ''}
            </p>

            <PhotoActions key={photo.id} photo={photo} className="pt-1" />

            <AdminPhotoMenu
              photoId={photo.id}
              photoTitle={photo.title}
              className="pt-1"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (hasPrevious) {
                    onNavigate(currentIndex - 1)
                  }
                }}
                disabled={!hasPrevious}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (hasNext) {
                    onNavigate(currentIndex + 1)
                  }
                }}
                disabled={!hasNext}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
