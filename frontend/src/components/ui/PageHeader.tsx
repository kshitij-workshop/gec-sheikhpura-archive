import type { ReactNode } from 'react'

export interface PageHeaderProps {
  /** Small uppercase label above the title, e.g. `Explore`. */
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={['space-y-3', className].filter(Boolean).join(' ')}>
      {eyebrow ? (
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-archive-accent">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-lg leading-relaxed text-archive-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
