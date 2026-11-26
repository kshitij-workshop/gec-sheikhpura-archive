import type { ReactNode } from 'react'

export interface SectionHeadingProps {
  /** Two-digit section index, e.g. `01`. */
  index?: string
  title: string
  description?: string
  action?: ReactNode
  id?: string
}

/**
 * Numbered section heading used across the public archive. The hairline and
 * index give long pages a printed-table-of-contents rhythm.
 */
export function SectionHeading({
  index,
  title,
  description,
  action,
  id,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-archive-line pt-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        {index ? (
          <span
            aria-hidden="true"
            className="pt-1 font-serif text-xs tracking-[0.18em] text-archive-accent"
          >
            {index}
          </span>
        ) : null}
        <div>
          <h2
            id={id}
            className="font-serif text-2xl font-normal leading-tight tracking-[-0.02em] text-archive-ink sm:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-archive-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
