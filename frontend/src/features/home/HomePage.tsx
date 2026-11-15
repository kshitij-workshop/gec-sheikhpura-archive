import { Link } from 'react-router'

import {
  Badge,
  buttonStyles,
  Card,
  PageHeader,
} from '../../components/ui'

const capabilities = [
  {
    title: 'Events and albums',
    description:
      'Browse institutional events, academic years, and curated albums from college history.',
    deliveryPhase: 'Phase 07',
  },
  {
    title: 'Moderated contributions',
    description:
      'Registered contributors submit photographs and track each submission through review.',
    deliveryPhase: 'Phase 08',
  },
  {
    title: 'Attribution and privacy',
    description:
      'Photographers receive explicit credit, and published images follow a strict privacy policy.',
    deliveryPhase: 'Phase 07',
  },
] as const

export default function HomePage() {
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Preserving college memory"
        title="The GEC Sheikhpura photograph archive, built by its community."
        description="A moderated, attribution-first home for the events, people, and places that shaped Government Engineering College, Sheikhpura."
        actions={
          <Link
            to="/archive"
            className={buttonStyles({ variant: 'primary' })}
          >
            Explore the archive
          </Link>
        }
      />

      <section
        aria-labelledby="status-heading"
        className="grid gap-4 sm:grid-cols-2"
      >
        <h2 id="status-heading" className="sr-only">
          Project status
        </h2>

        <Card className="space-y-2 p-6">
          <Badge tone="success">Foundation ready</Badge>
          <h3 className="font-serif text-xl font-semibold tracking-tight">
            The shell is in place
          </h3>
          <p className="text-sm leading-relaxed text-archive-muted">
            The design system, navigation, routing, and session-aware API client
            are complete. Access tokens are held in memory and refreshed from a
            secure HttpOnly cookie.
          </p>
        </Card>

        <Card className="space-y-2 p-6">
          <Badge tone="accent">Coming next</Badge>
          <h3 className="font-serif text-xl font-semibold tracking-tight">
            Public browsing
          </h3>
          <p className="text-sm leading-relaxed text-archive-muted">
            Published events, albums, and photographs arrive with the public
            website. Every community submission passes moderation before it
            appears here.
          </p>
        </Card>
      </section>

      <section aria-labelledby="capabilities-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="capabilities-heading"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            What the archive will offer
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-archive-muted">
            Each capability is delivered by a later phase and remains guarded by
            server-side authorization throughout.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {capabilities.map((capability) => (
            <li key={capability.title}>
              <Card className="h-full space-y-2 p-5">
                <h3 className="font-medium text-archive-ink">
                  {capability.title}
                </h3>
                <p className="text-sm leading-relaxed text-archive-muted">
                  {capability.description}
                </p>
                <p className="text-xs uppercase tracking-[0.15em] text-archive-muted">
                  {capability.deliveryPhase}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
