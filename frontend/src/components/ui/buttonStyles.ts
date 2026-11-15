export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export type ButtonSize = 'sm' | 'md'

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-archive-ink text-archive-paper hover:bg-stone-700 active:bg-stone-800',
  secondary:
    'border border-archive-line bg-archive-surface text-archive-ink hover:border-stone-300 hover:bg-stone-50',
  ghost:
    'text-archive-muted hover:bg-stone-100 hover:text-archive-ink',
  danger: 'bg-archive-danger text-white hover:bg-red-800 active:bg-red-900',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
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
