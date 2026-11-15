import { Link } from 'react-router'

import { Alert, Card, PageHeader } from '../../components/ui'
import { buttonStyles } from '../../components/ui/buttonStyles'
import { useAuth } from '../auth/useAuth'

export default function SignInPage() {
  const { status, user } = useAuth()

  if (status === 'authenticated' && user !== null) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          eyebrow="Account"
          title="You are signed in"
          description={`Signed in as ${user.displayName}.`}
        />
        <Card className="space-y-4 p-6">
          <Alert tone="success" title="Session active">
            Your access token is kept in memory and refreshed from an
            HttpOnly cookie.
          </Alert>
          <Link
            to="/dashboard"
            className={buttonStyles({ variant: 'primary' })}
          >
            Go to your dashboard
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Sign in"
        description="Access your submissions, event suggestions, and removal requests."
      />
      <Card className="space-y-4 p-6">
        <Alert tone="info" title="Sign-in form arrives in Phase 07">
          The session foundation is already active: credentials will post to
          <code className="mx-1 rounded bg-stone-100 px-1 py-0.5 text-xs">
            POST /api/v1/auth/login
          </code>
          and the access token is stored in memory only.
        </Alert>
        <p className="text-sm leading-relaxed text-archive-muted">
          Until then, accounts can be created and verified through the API and
          Mailpit locally.
        </p>
      </Card>
    </div>
  )
}
