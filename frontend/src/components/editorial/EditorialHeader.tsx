import type { ReactNode } from 'react'

export interface EditorialHeaderProps {
  /** Small uppercase label above the title, e.g. `The collection`. */
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  /** Optional metadata row rendered beneath the title block. */
  meta?: ReactNode
}

/**
 * Masthead for public archive pages. The scale is intentionally larger than
 * the member workspace: this is the editorial voice of the archive, not an
 * application header.
 */
export function EditorialHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: EditorialHeaderProps) {
  return (
    <header className="border-b border-archive-line pb-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          {eyebrow ? (
            <p className="eyebrow text-archive-accent">{eyebrow}</p>
          ) : null}
          <h1 className="mt-4 font-serif text-[clamp(2.75rem,6vw,5.5rem)] font-normal leading-[0.94] tracking-[-0.035em] text-archive-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-archive-muted sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {meta ? <div className="mt-8">{meta}</div> : null}
    </header>
  )
}
