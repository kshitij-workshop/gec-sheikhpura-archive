import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import {
  Alert,
  Button,
  Card,
  PageHeader,
  buttonStyles,
} from '../../components/ui'
import { resetPassword } from '../../lib/api/accountApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { passwordProblem } from '../../lib/passwordPolicy'
import { useAuth } from '../auth/useAuth'
import { NewPasswordFields } from './NewPasswordFields'

interface FieldErrors {
  password?: string
  confirmPassword?: string
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const { clearSession } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const passwordIssue = passwordProblem(password)
    const next: FieldErrors = {}

    if (passwordIssue !== null) {
      next.password = passwordIssue
    }
    if (confirmPassword.length === 0) {
      next.confirmPassword = 'Repeat your new password.'
    } else if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      await resetPassword({ token, password })
      // Resetting revokes every refresh token for the account.
      clearSession()
      setComplete(true)
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setFormError(
        requestFailureMessage(
          error,
          'The password could not be reset. Request a new link and try again.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (token.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          eyebrow="Account"
          title="Reset your password"
          description="Password reset links are single-use and expire after one hour."
        />
        <Card className="space-y-4 p-6">
          <Alert tone="warning" title="This link is incomplete">
            Open the reset link from your email, or request a new one.
          </Alert>
          <Link
            to="/forgot-password"
            className={buttonStyles({ variant: 'primary' })}
          >
            Request a new link
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Choose a new password"
        description="Signing in again is required after the change."
      />

      <Card className="space-y-4 p-6">
        {complete ? (
          <Alert tone="success" title="Password reset">
            <p>Your password has been changed. Sign in with the new password.</p>
            <Link
              to="/sign-in?passwordChanged=1"
              className={`${buttonStyles({ variant: 'primary', size: 'sm' })} mt-3`}
            >
              Sign in
            </Link>
          </Alert>
        ) : (
          <>
            {formError ? (
              <Alert tone="danger" title="Could not reset the password">
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
              <NewPasswordFields
                idPrefix="reset"
                password={password}
                confirmPassword={confirmPassword}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                passwordError={errors.password}
                confirmPasswordError={errors.confirmPassword}
                hint="At least 12 characters, including a letter and a number."
              />

              <Button type="submit" fullWidth isLoading={submitting}>
                Set new password
              </Button>
            </form>

            <p className="text-sm text-archive-muted">
              Link expired?{' '}
              <Link
                to="/forgot-password"
                className="font-medium text-archive-accent underline-offset-4 hover:underline"
              >
                Request another reset email
              </Link>
              .
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
