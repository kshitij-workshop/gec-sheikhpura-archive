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
import { requestPasswordReset } from '../../lib/api/accountApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const address = email.trim()
    if (!z.email().safeParse(address).success) {
      setEmailError('Enter a valid email address.')
      return
    }

    setEmailError(undefined)
    setSubmitting(true)

    try {
      const response = await requestPasswordReset(address)
      setMessage(response.message)
    } catch (error) {
      setFormError(
        requestFailureMessage(
          error,
          'The password reset request could not be sent. Please try again.',
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
        title="Forgot your password?"
        description="We can email a single-use link to set a new password."
      />

      <Card className="space-y-4 p-6">
        {message ? (
          <Alert tone="success" title="Check your email">
            <p>{message}</p>
            <p className="mt-2">
              Reset links expire after one hour. If nothing arrives, check the
              address and try again.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/sign-in"
                className={buttonStyles({ variant: 'primary', size: 'sm' })}
              >
                Back to sign in
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMessage(null)
                }}
              >
                Try another address
              </Button>
            </div>
          </Alert>
        ) : (
          <>
            {formError ? (
              <Alert tone="danger" title="Could not send the reset link">
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
                id="forgot-email"
                name="email"
                type="email"
                label="Email address"
                autoComplete="email"
                value={email}
                error={emailError}
                onChange={(event) => {
                  setEmail(event.target.value)
                }}
              />
              <Button type="submit" fullWidth isLoading={submitting}>
                Send reset link
              </Button>
            </form>

            <p className="text-sm text-archive-muted">
              Remembered it?{' '}
              <Link
                to="/sign-in"
                className="font-medium text-archive-accent underline-offset-4 hover:underline"
              >
                Return to sign in
              </Link>
              .
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
