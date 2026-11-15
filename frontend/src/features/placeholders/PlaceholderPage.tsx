import type { ReactNode } from 'react'

import { Card, PageHeader } from '../../components/ui'

export interface PlaceholderPageProps {
  eyebrow: string
  title: string
  description: string
  /** Which phase delivers the real page. */
  deliveryPhase: string
  notes?: string[]
  actions?: ReactNode
}

/**
 * Route scaffold used until the owning feature phase replaces it. It keeps
 * navigation, guards, and code splitting verifiable without pretending the
 * feature is finished.
 */
export function PlaceholderPage({
  eyebrow,
  title,
  description,
  deliveryPhase,
  notes = [],
  actions,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      <Card className="space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-semibold tracking-tight">
            Foundation route
          </h2>
          <p className="text-sm leading-relaxed text-archive-muted">
            This route is wired into the application shell and access guards.
            The full experience is delivered in {deliveryPhase}.
          </p>
        </div>

        {notes.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-archive-muted">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  )
}
