import type { ReactNode } from 'react'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<AlertTone, string> = {
  info: 'border-archive-info/30 bg-archive-info-soft text-archive-info',
  success: 'border-archive-success/30 bg-archive-success-soft text-archive-success',
  warning: 'border-archive-warning/30 bg-archive-warning-soft text-archive-warning',
  danger: 'border-archive-danger/30 bg-archive-danger-soft text-archive-danger',
}

export interface AlertProps {
  tone?: AlertTone
  title?: string
  children: ReactNode
  className?: string
}

/**
 * Inline status message. Errors announce themselves immediately; all other
 * tones are polite status regions.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={[
        'rounded-sm border px-4 py-3 text-sm leading-relaxed',
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  )
}
