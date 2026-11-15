import { Link } from 'react-router'

import { buttonStyles } from '../../components/ui/buttonStyles'

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-archive-accent">
        403 Forbidden
      </p>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        You do not have access to this area.
      </h1>
      <p className="text-archive-muted">
        Administrative pages are limited to moderators. If you believe this is a
        mistake, contact the archive team.
      </p>
      <Link to="/" className={buttonStyles({ variant: 'primary' })}>
        Return home
      </Link>
    </div>
  )
}
