export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export type ButtonSize = 'sm' | 'md'

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-[0.01em] transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-archive-ink text-archive-paper hover:bg-archive-ink/90 active:bg-archive-ink/80',
  secondary:
    'border border-archive-line bg-transparent text-archive-ink hover:border-archive-accent hover:text-archive-accent',
  ghost: 'text-archive-muted hover:bg-archive-accent-soft hover:text-archive-ink',
  danger: 'bg-archive-danger text-white hover:opacity-90 active:opacity-80',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
}

/**
 * Shared button classes so links and buttons can look identical without
 * duplicating Tailwind strings across the application.
 */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonStyleOptions = {}): string {
  return [
    base,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
