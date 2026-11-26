import { buttonStyles } from './buttonStyles'
import { buildPageItems } from './paginationRange'

export interface PaginationProps {
  /** Zero-based current page. */
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  disabled?: boolean
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  disabled = false,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const current = Math.min(Math.max(0, page), totalPages - 1)
  const items = buildPageItems(current, totalPages)

  return (
    <nav
      aria-label="Pagination"
      className={['flex flex-wrap items-center justify-center gap-2', className]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={buttonStyles({ variant: 'secondary', size: 'sm' })}
        onClick={() => {
          onPageChange(current - 1)
        }}
        disabled={disabled || current === 0}
      >
        Previous
      </button>

      <ul className="flex items-center gap-1">
        {items.map((item, index) => {
          if (typeof item === 'string') {
            return (
              <li
                key={`${item}-${String(index)}`}
                aria-hidden="true"
                className="px-2 text-sm text-archive-muted"
              >
                …
              </li>
            )
          }

          const isCurrent = item === current
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => {
                  onPageChange(item)
                }}
                disabled={disabled}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${String(item + 1)}`}
                className={[
                  'min-w-9 rounded-sm px-2 py-1 text-sm font-medium transition-colors',
                  isCurrent
                    ? 'bg-archive-ink text-archive-paper'
                    : 'text-archive-muted hover:bg-archive-accent-soft hover:text-archive-ink',
                ].join(' ')}
              >
                {item + 1}
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className={buttonStyles({ variant: 'secondary', size: 'sm' })}
        onClick={() => {
          onPageChange(current + 1)
        }}
        disabled={disabled || current >= totalPages - 1}
      >
        Next
      </button>
    </nav>
  )
}
