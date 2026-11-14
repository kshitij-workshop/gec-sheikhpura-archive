import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-archive-accent">
        Not found
      </p>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        This page is not in the archive.
      </h1>
      <p className="text-stone-600">
        The address may be mistyped, or the page may arrive in a later phase.
      </p>
      <Link
        to="/"
        className="inline-flex rounded bg-archive-ink px-4 py-2 text-sm font-medium text-archive-paper hover:bg-stone-700"
      >
        Return home
      </Link>
    </div>
  )
}
