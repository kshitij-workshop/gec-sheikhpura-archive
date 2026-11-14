const plannedCapabilities = [
  {
    title: 'Events and albums',
    description:
      'Browse institutional events, academic years, and curated albums from college history.',
  },
  {
    title: 'Moderated contributions',
    description:
      'Registered contributors submit photographs and track each submission through review.',
  },
  {
    title: 'Attribution and privacy',
    description:
      'Photographers receive explicit credit, and published images follow a strict privacy policy.',
  },
] as const

export function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-archive-accent">
          Preserving college memory
        </p>
        <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          The GEC Sheikhpura photograph archive, built by its community.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-stone-600">
          A moderated, attribution-first home for the events, people, and places
          that shaped Government Engineering College, Sheikhpura.
        </p>
      </section>

      <section aria-labelledby="status-heading" className="space-y-4">
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2
            id="status-heading"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            Foundation in progress
          </h2>
          <p className="mt-2 max-w-2xl text-stone-600">
            Phase 00 sets up the repository, toolchains, local infrastructure,
            and verification pipeline. Public archive browsing, accounts,
            uploads, and moderation arrive in later phases.
          </p>
        </div>
      </section>

      <section aria-labelledby="capabilities-heading" className="space-y-4">
        <h2
          id="capabilities-heading"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          What the archive will offer
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {plannedCapabilities.map((capability) => (
            <li
              key={capability.title}
              className="rounded-lg border border-stone-200 bg-white p-5"
            >
              <h3 className="font-medium text-stone-900">{capability.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {capability.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
