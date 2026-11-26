export interface SkeletonProps {
  className?: string
}

/** Neutral placeholder used while a section loads. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-sm bg-archive-line/70 ${className ?? ''}`}
    />
  )
}
