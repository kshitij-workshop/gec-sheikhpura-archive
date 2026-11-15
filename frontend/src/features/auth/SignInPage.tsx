import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import {
  Alert,
  Button,
  Card,
  PageHeader,
  TextField,
  buttonStyles,
} from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import { useAuth } from './useAuth'

const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

interface FieldErrors {
  email?: string
  password?: string
}

/** Maps transport failures to safe, non-enumerating guidance. */
function signInMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Email or password is incorrect.'
    }
    if (error.status === 429) {
      return 'Too many sign-in attempts. Wait a moment and try again.'
    }
    if (error.status === 403) {
      return 'Sign-in was blocked by the server. Try again from the archive’s official address.'
    }
    return error.problem?.detail ?? 'Sign-in failed. Please try again.'
  }

  return 'The server could not be reached. Check your connection and try again.'
}

/** Only same-origin router paths may be used as a post-login target. */
function safeRedirect(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
    ? value
    : '/dashboard'
}

export default function SignInPage() {
  const { status, user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const passwordChanged = searchParams.get('passwordChanged') === '1'
  const state = location.state as { from?: unknown } | null
  const target = safeRedirect(state?.from)

  if (status === 'authenticated' && user !== null) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          eyebrow="Account"
          title="You are signed in"
          description={`Signed in as ${user.displayName}.`}
        />
        <Card className="space-y-4 p-6">
          {user.passwordChangeRequired ? (
            <Alert tone="warning" title="Password change required">
              This account is using a temporary password. Replace it before
              contributing.
            </Alert>
          ) : (
            <Alert tone="success" title="Session active">
              Your access token is kept in memory and refreshed from an
              HttpOnly cookie.
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Link to={target} className={buttonStyles({ variant: 'primary' })}>
              Continue
            </Link>
            <Link
              to="/dashboard"
              className={buttonStyles({ variant: 'secondary' })}
            >
              Go to your dashboard
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const result = signInSchema.safeParse({ email: email.trim(), password })

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      })
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      await login(result.data)
      navigate(target, { replace: true })
    } catch (error) {
      setFormError(signInMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Sign in"
        description="Access your submissions, event suggestions, and removal requests."
      />

      <Card className="space-y-4 p-6">
        {status === 'loading' ? (
          <Alert tone="info" title="Checking your session">
            One moment while the archive restores your session.
          </Alert>
        ) : null}

        {passwordChanged ? (
          <Alert tone="success" title="Password changed">
            Sign in again with your new password.
          </Alert>
        ) : null}

        {formError ? (
          <Alert tone="danger" title="Could not sign in">
            {formError}
          </Alert>
        ) : null}

        <form
          noValidate
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
          className="space-y-4"
        >
          <TextField
            id="sign-in-email"
            name="email"
            type="email"
            label="Email address"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
          />

          <TextField
            id="sign-in-password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value)
            }}
          />

          <Button
            type="submit"
            fullWidth
            isLoading={submitting}
            disabled={status === 'loading'}
          >
            Sign in
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-archive-line pt-4 text-sm">
          <Link
            to="/forgot-password"
            className="font-medium text-archive-accent underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
          <Link
            to="/register"
            className="font-medium text-archive-accent underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </div>

        <p className="text-sm leading-relaxed text-archive-muted">
          New accounts must verify their email address before contributing.
        </p>
      </Card>
    </div>
  )
}
