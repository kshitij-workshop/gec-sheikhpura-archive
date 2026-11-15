import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'

import {
  Alert,
  Button,
  Card,
  PageHeader,
  TextField,
  buttonStyles,
} from '../../components/ui'
import { registerAccount } from '../../lib/api/accountApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { passwordProblem } from '../../lib/passwordPolicy'
import { useAuth } from '../auth/useAuth'
import { NewPasswordFields } from './NewPasswordFields'

const PASSWORD_HINT =
  'At least 12 characters, including a letter and a number.'

interface FieldErrors {
  displayName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

interface FormValues {
  displayName: string
  email: string
  password: string
  confirmPassword: string
}

const emptyForm: FormValues = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterPage() {
  const { status, user } = useAuth()
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated' && user !== null) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          eyebrow="Account"
          title="You already have an account"
          description={`Signed in as ${user.displayName}.`}
        />
        <Card className="space-y-4 p-6">
          <Alert tone="info" title="No new account needed">
            Sign out first if you need to register a different address on this
            device.
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard"
              className={buttonStyles({ variant: 'primary' })}
            >
              Go to your dashboard
            </Link>
            <Link
              to="/account/password"
              className={buttonStyles({ variant: 'secondary' })}
            >
              Change your password
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const update = (patch: Partial<FormValues>) => {
    setForm((current) => ({ ...current, ...patch }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSuccess(null)

    const displayName = form.displayName.trim()
    const email = form.email.trim()
    const next: FieldErrors = {}

    if (displayName.length < 2) {
      next.displayName = 'Enter the name the archive should display.'
    } else if (displayName.length > 120) {
      next.displayName = 'Use 120 characters or fewer.'
    }
    if (!z.email().safeParse(email).success) {
      next.email = 'Enter a valid email address.'
    }

    const passwordIssue = passwordProblem(form.password, {
      email,
      displayName,
    })
    if (passwordIssue !== null) {
      next.password = passwordIssue
    }
    if (form.confirmPassword.length === 0) {
      next.confirmPassword = 'Repeat your password.'
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      const response = await registerAccount({
        displayName,
        email,
        password: form.password,
      })
      setSuccess(response.message)
      setForm(emptyForm)
    } catch (error) {
      setFormError(
        requestFailureMessage(
          error,
          'The registration request could not be sent. Please try again.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Create your account"
        description="Members can contribute photographs, suggest events, and track their submissions through moderation."
      />

      <Card className="space-y-4 p-6">
        {success ? (
          <Alert tone="success" title="Check your email">
            <p>{success}</p>
            <p className="mt-2">
              Verify the address before signing in. Verification links expire,
              so you can request a new one at any time.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/verify-email"
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                Resend verification email
              </Link>
              <Link
                to="/sign-in"
                className={buttonStyles({ variant: 'primary', size: 'sm' })}
              >
                Go to sign in
              </Link>
            </div>
          </Alert>
        ) : (
          <>
            {formError ? (
              <Alert tone="danger" title="Could not create the account">
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
                id="register-display-name"
                name="displayName"
                label="Display name"
                autoComplete="name"
                hint="Shown with your contributions. Your email address is never published."
                value={form.displayName}
                error={errors.displayName}
                onChange={(event) => {
                  update({ displayName: event.target.value })
                }}
              />

              <TextField
                id="register-email"
                name="email"
                type="email"
                label="Email address"
                autoComplete="email"
                value={form.email}
                error={errors.email}
                onChange={(event) => {
                  update({ email: event.target.value })
                }}
              />

              <NewPasswordFields
                idPrefix="register"
                password={form.password}
                confirmPassword={form.confirmPassword}
                onPasswordChange={(password) => {
                  update({ password })
                }}
                onConfirmPasswordChange={(confirmPassword) => {
                  update({ confirmPassword })
                }}
                passwordError={errors.password}
                confirmPasswordError={errors.confirmPassword}
                passwordLabel="Password"
                hint={PASSWORD_HINT}
              />

              <Button type="submit" fullWidth isLoading={submitting}>
                Create account
              </Button>
            </form>

            <p className="text-sm text-archive-muted">
              Already registered?{' '}
              <Link
                to="/sign-in"
                className="font-medium text-archive-accent underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
              .
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
