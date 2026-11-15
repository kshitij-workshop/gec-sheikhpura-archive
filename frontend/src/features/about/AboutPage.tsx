import { Link } from 'react-router'

import { Card, PageHeader, buttonStyles } from '../../components/ui'

const principles = [
  {
    title: 'One trusted record',
    description:
      'Photographs from college events are preserved in one moderated archive instead of scattering across personal devices, messaging groups, and social feeds.',
  },
  {
    title: 'Community contributions',
    description:
      'Verified members of the college community upload photographs, suggest events, and track their submissions through review.',
  },
  {
    title: 'Attribution before publication',
    description:
      'The person who uploads a photograph is not assumed to be its photographer. Credits are recorded explicitly and displayed with each published image.',
  },
] as const

const policies = [
  {
    title: 'Moderation',
    description:
      'Every submission is reviewed by an administrator before publication. Rejected, hidden, and removed photographs never appear in public listings or public image URLs.',
  },
  {
    title: 'Privacy',
    description:
      'The archive does not use facial recognition or automatically identify students. Public responses omit account and contact details.',
  },
  {
    title: 'Corrections and removal',
    description:
      'Anyone can report a published photograph. Uploaders may request removal of their own submissions, and administrators review both reports and removal requests.',
  },
] as const

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="About"
        title="Preserving college memory, carefully"
        description="The GEC Sheikhpura Archive is a community-driven photographic record of Government Engineering College, Sheikhpura, built for future generations."
        actions={
          <Link to="/archive" className={buttonStyles({ variant: 'primary' })}>
            Explore the archive
          </Link>
        }
      />

      <section aria-labelledby="mission-heading" className="space-y-4">
        <h2
          id="mission-heading"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          Why this archive exists
        </h2>
        <p className="max-w-3xl text-base leading-relaxed text-archive-muted">
          College life passes quickly. Photographs that document it are often
          held by individuals, shared briefly, and then lost. This archive gives
          the institution a durable, searchable, and respectful home for those
          images, so that the events, people, and places that shaped the college
          remain available to the students and historians who come next.
        </p>
      </section>

      <section aria-labelledby="principles-heading" className="space-y-4">
        <h2
          id="principles-heading"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          Principles
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {principles.map((principle) => (
            <li key={principle.title}>
              <Card className="h-full space-y-2 p-5">
                <h3 className="font-medium text-archive-ink">
                  {principle.title}
                </h3>
                <p className="text-sm leading-relaxed text-archive-muted">
                  {principle.description}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="policies-heading" className="space-y-4">
        <h2
          id="policies-heading"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          Publication and privacy
        </h2>
        <dl className="divide-y divide-archive-line rounded-xl border border-archive-line bg-archive-surface">
          {policies.map((policy) => (
            <div key={policy.title} className="space-y-1 p-5">
              <dt className="font-medium text-archive-ink">{policy.title}</dt>
              <dd className="max-w-3xl text-sm leading-relaxed text-archive-muted">
                {policy.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="contribute-heading"
        className="space-y-3 rounded-xl border border-archive-line bg-archive-accent-soft p-6"
      >
        <h2
          id="contribute-heading"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          Contribute to the archive
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-archive-muted">
          If you have photographs from a college event, sign in to submit them
          with accurate photographer credits. Every contribution is reviewed
          before it becomes part of the public record.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/contribute" className={buttonStyles({ variant: 'primary' })}>
            Share photographs
          </Link>
          <Link
            to="/contributors"
            className={buttonStyles({ variant: 'secondary' })}
          >
            Meet the contributors
          </Link>
        </div>
      </section>
    </div>
  )
}
