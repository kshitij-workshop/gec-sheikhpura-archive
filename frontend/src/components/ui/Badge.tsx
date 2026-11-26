import type { ReactNode } from 'react'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-archive-line bg-archive-surface text-archive-muted',
  accent: 'border-archive-accent/40 bg-archive-accent-soft text-archive-accent',
  success: 'border-archive-success/30 bg-archive-success-soft text-archive-success',
  warning: 'border-archive-warning/30 bg-archive-warning-soft text-archive-warning',
  danger: 'border-archive-danger/30 bg-archive-danger-soft text-archive-danger',
  info: 'border-archive-info/30 bg-archive-info-soft text-archive-info',
}

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]',
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
