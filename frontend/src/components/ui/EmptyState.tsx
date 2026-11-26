import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center gap-3 rounded-sm border border-dashed border-archive-line bg-archive-surface px-6 py-14 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h2 className="font-serif text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-archive-muted">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  )
}
