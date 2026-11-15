import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Accessible modal built on the native `<dialog>` element.
 *
 * Browsers provide the modal stack, focus trap, Escape handling, and focus
 * restoration; a small fallback keeps jsdom and legacy engines functional.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

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

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      className="w-[min(32rem,calc(100vw-3rem))] rounded-xl border border-archive-line bg-archive-surface p-0 text-archive-ink shadow-xl backdrop:bg-stone-900/50"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-archive-line px-5 py-4">
          <div className="space-y-1">
            <h2
              id={titleId}
              className="font-serif text-xl font-semibold tracking-tight"
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-sm text-archive-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-archive-muted transition-colors hover:bg-stone-100 hover:text-archive-ink"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 text-sm">{children}</div>

        {footer ? (
          <div className="flex justify-end gap-2 border-t border-archive-line px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  )
}
