import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'

import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  TextField,
  buttonStyles,
} from '../../components/ui'
import { updateProfile } from '../../lib/api/accountApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import type { PersistedRole } from '../../lib/api/types'
import { formatTimestamp } from '../../lib/format'
import { useAuth } from '../auth/useAuth'

const roleLabels: Record<PersistedRole, string> = {
  USER: 'Member',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super administrator',
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user === null) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Member area" title="Profile" />
        <Alert tone="warning" title="Sign in required">
          Your session ended before the profile loaded.
        </Alert>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const trimmed = displayName.trim()
    if (trimmed.length < 2) {
      setNameError('Use at least 2 characters.')
      return
    }
    if (trimmed.length > 120) {
      setNameError('Use 120 characters or fewer.')
      return
    }

    setNameError(undefined)
    setSubmitting(true)

    try {
      const updated = await updateProfile(trimmed)
      setUser(updated)
      setDisplayName(updated.displayName)
      setNotice('Profile updated.')
    } catch (error) {
      setFormError(
        requestFailureMessage(
          error,
          'The profile could not be updated. Please try again.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Member area"
        title="Profile"
        description="How your account appears to you and to archive moderators."
      />

      {notice ? (
        <Alert tone="success" title="Saved">
          {notice}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Account details
            </h2>
            <p className="text-sm text-archive-muted">
              Your display name appears with contributions. Your email address
              is never published.
            </p>
          </div>

          {formError ? (
            <Alert tone="danger" title="Could not save">
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
              id="profile-display-name"
              label="Display name"
              autoComplete="name"
              value={displayName}
              error={nameError}
              maxLength={120}
              onChange={(event) => {
                setDisplayName(event.target.value)
              }}
            />

            <Button type="submit" isLoading={submitting}>
              Save profile
            </Button>
          </form>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Sign-in and access
            </h2>
            <p className="text-sm text-archive-muted">
              Account settings that keep your contributions attributed.
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-archive-muted">Email address</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-archive-muted">Role</dt>
              <dd>
                <Badge tone="accent">{roleLabels[user.role]}</Badge>
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-archive-muted">Email verified</dt>
              <dd className="font-medium">
                {user.emailVerifiedAt
                  ? formatTimestamp(user.emailVerifiedAt)
                  : 'Not verified'}
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-archive-muted">Member since</dt>
              <dd className="font-medium">{formatTimestamp(user.createdAt)}</dd>
            </div>
          </dl>

          <div className="space-y-2 border-t border-archive-line pt-4">
            <Link
              to="/account/password"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              Change password
            </Link>
            <p className="text-xs leading-relaxed text-archive-muted">
              Email changes are handled by the archive office so account
              ownership can be verified.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
