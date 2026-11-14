import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application error', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Something went wrong.
          </h1>
          <p className="text-stone-600">
            The archive could not render this page. Reload to try again.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.reload()
            }}
            className="rounded bg-archive-ink px-4 py-2 text-sm font-medium text-archive-paper hover:bg-stone-700"
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
