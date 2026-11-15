import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'

import {
  Alert,
  Button,
  Card,
  PageHeader,
  TextField,
  buttonStyles,
} from '../../components/ui'
import { resendVerification, verifyEmail } from '../../lib/api/accountApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'

type VerificationState = 'idle' | 'working' | 'verified' | 'failed'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [verification, setVerification] =
    useState<VerificationState>('idle')
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  )
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const handleVerify = async () => {
    if (token.length === 0) {
      return
    }

    setVerification('working')
    setVerificationError(null)

    try {
      await verifyEmail(token)
      setVerification('verified')
    } catch (error) {
      setVerification('failed')
      setVerificationError(
        requestFailureMessage(
          error,
          'This verification link is invalid or has expired.',
        ),
      )
    }
  }

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResendMessage(null)
    setResendError(null)

    const address = email.trim()
    if (!z.email().safeParse(address).success) {
      setEmailError('Enter the email address you registered with.')
      return
    }

    setEmailError(undefined)
    setResending(true)

    try {
      const response = await resendVerification(address)
      setResendMessage(response.message)
    } catch (error) {
      setResendError(
        requestFailureMessage(
          error,
          'A new verification email could not be requested.',
        ),
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Verify your email"
        description="Confirm the address on your account before signing in."
      />

      <Card className="space-y-4 p-6">
        {verification === 'verified' ? (
          <Alert tone="success" title="Your email is verified">
            <p>You can now sign in and start contributing to the archive.</p>
            <Link
              to="/sign-in"
              className={`${buttonStyles({ variant: 'primary', size: 'sm' })} mt-3`}
            >
              Sign in
            </Link>
          </Alert>
        ) : (
          <>
            {token.length > 0 ? (
              <>
                <p className="text-sm leading-relaxed text-archive-muted">
                  This confirmation is tied to the link in your verification
                  email. Nothing changes until you choose to verify.
                </p>
                {verification === 'failed' && verificationError ? (
                  <Alert tone="danger" title="Verification failed">
                    {verificationError}
                  </Alert>
                ) : null}
                <Button
                  type="button"
                  isLoading={verification === 'working'}
                  onClick={() => {
                    void handleVerify()
                  }}
                >
                  Verify my email
                </Button>
              </>
            ) : (
              <Alert tone="info" title="Open your verification link">
                Use the link from your verification email. If it has expired,
                request a new one below.
              </Alert>
            )}
          </>
        )}
      </Card>

      {verification !== 'verified' ? (
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Send a new verification link
            </h2>
            <p className="text-sm text-archive-muted">
              Only unverified accounts receive a new link.
            </p>
          </div>

          {resendMessage ? (
            <Alert tone="success" title="Request received">
              {resendMessage}
            </Alert>
          ) : null}
          {resendError ? (
            <Alert tone="danger" title="Could not send a new link">
              {resendError}
            </Alert>
          ) : null}

          <form
            noValidate
            onSubmit={(event) => {
              void handleResend(event)
            }}
            className="space-y-4"
          >
            <TextField
              id="verify-email-address"
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
            <Button type="submit" variant="secondary" isLoading={resending}>
              Send new link
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
