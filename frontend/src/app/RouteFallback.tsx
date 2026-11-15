import { Spinner } from '../components/ui'

export interface RouteFallbackProps {
  label?: string
}

export function RouteFallback({ label = 'Loading' }: RouteFallbackProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner label={label} className="h-6 w-6 text-archive-muted" />
    </div>
  )
}
