import type { ReactNode } from 'react'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-archive-line bg-stone-100 text-stone-700',
  accent: 'border-amber-300 bg-archive-accent-soft text-archive-accent',
  success: 'border-green-200 bg-archive-success-soft text-archive-success',
  warning: 'border-amber-200 bg-archive-warning-soft text-archive-warning',
  danger: 'border-red-200 bg-archive-danger-soft text-archive-danger',
  info: 'border-blue-200 bg-archive-info-soft text-archive-info',
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
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
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
