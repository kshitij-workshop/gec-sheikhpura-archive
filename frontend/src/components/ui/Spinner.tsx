export interface SpinnerProps {
  /** Tailwind size classes, e.g. `h-4 w-4`. */
  className?: string
  label?: string
}

export function Spinner({
  className = 'h-5 w-5',
  label = 'Loading',
}: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      <svg
        aria-hidden="true"
        className={`animate-spin text-current ${className}`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
