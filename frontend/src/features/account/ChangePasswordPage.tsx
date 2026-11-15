import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  Alert,
  Button,
  Card,
  PageHeader,
  TextField,
  buttonStyles,
} from '../../components/ui'
import { changePassword } from '../../lib/api/accountApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { passwordProblem } from '../../lib/passwordPolicy'
import { useAuth } from '../auth/useAuth'
import { NewPasswordFields } from './NewPasswordFields'

interface FieldErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export default function ChangePasswordPage() {
  const { user, clearSession } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user === null) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader eyebrow="Account" title="Change your password" />
        <Card className="space-y-4 p-6">
          <Alert tone="warning" title="Sign in required">
            Your session ended before the form loaded.
          </Alert>
          <Link
            to="/sign-in"
            className={buttonStyles({ variant: 'primary' })}
          >
            Sign in
          </Link>
        </Card>
      </div>
    )
  }

  const required = user.passwordChangeRequired

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const next: FieldErrors = {}

    if (currentPassword.length === 0) {
      next.currentPassword = 'Enter your current password.'
    }
    const passwordIssue = passwordProblem(newPassword, {
      email: user.email,
      displayName: user.displayName,
    })
    if (passwordIssue !== null) {
      next.newPassword = passwordIssue
    }
    if (confirmPassword.length === 0) {
      next.confirmPassword = 'Repeat your new password.'
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      await changePassword({ currentPassword, newPassword })
      // The server revokes every refresh token and clears the cookie.
      clearSession()
      void navigate('/sign-in?passwordChanged=1', { replace: true })
    } catch (error) {
      setFormError(
        requestFailureMessage(
          error,
          'The password could not be changed. Please try again.',
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
        title={required ? 'Change your password' : 'Update your password'}
        description={
          required
            ? 'This account is using a temporary password. Choose your own before continuing.'
            : 'Choose a new password. Other sessions and devices are signed out.'
        }
      />

      <Card className="space-y-4 p-6">
        {required ? (
          <Alert tone="warning" title="Password change required">
            Contributor pages stay locked until the temporary password is
            replaced.
          </Alert>
        ) : null}

        {formError ? (
          <Alert tone="danger" title="Could not change the password">
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
            id="change-current-password"
            name="current-password"
            type="password"
            label="Current password"
            autoComplete="current-password"
            value={currentPassword}
            error={errors.currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
            }}
          />

          <NewPasswordFields
            idPrefix="change"
            password={newPassword}
            confirmPassword={confirmPassword}
            onPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            passwordError={errors.newPassword}
            confirmPasswordError={errors.confirmPassword}
            hint="At least 12 characters, including a letter and a number. It must differ from the current password."
          />

          <Button type="submit" fullWidth isLoading={submitting}>
            Change password
          </Button>
        </form>

        <p className="text-sm text-archive-muted">
          You will be signed out and asked to sign in with the new password.
        </p>
      </Card>
    </div>
  )
}
