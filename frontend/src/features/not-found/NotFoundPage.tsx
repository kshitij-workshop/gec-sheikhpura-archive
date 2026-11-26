import { Link } from 'react-router'

import { buttonStyles } from '../../components/ui'

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 border-y border-archive-line py-20 text-center">
      <p className="eyebrow text-archive-accent">404 · Not found</p>
      <h1 className="font-serif text-4xl font-normal leading-[1.05] tracking-[-0.03em] text-archive-ink sm:text-5xl">
        This page is not in the archive.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-archive-muted">
        The address may be mistyped, or the page may arrive in a later phase.
      </p>
      <Link to="/" className={buttonStyles({ variant: 'primary' })}>
        Return home
      </Link>
    </div>
  )
}
