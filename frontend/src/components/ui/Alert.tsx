import type { ReactNode } from 'react'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<AlertTone, string> = {
  info: 'border-blue-200 bg-archive-info-soft text-blue-900',
  success: 'border-green-200 bg-archive-success-soft text-green-900',
  warning: 'border-amber-200 bg-archive-warning-soft text-amber-900',
  danger: 'border-red-200 bg-archive-danger-soft text-red-900',
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
        'rounded-md border px-4 py-3 text-sm leading-relaxed',
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
