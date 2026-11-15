import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Badge } from '../../components/ui'
import { buttonStyles } from '../../components/ui/buttonStyles'
import type { PersistedRole } from '../../lib/api/types'
import { useAuth } from './useAuth'

const roleLabels: Record<PersistedRole, string> = {
  USER: 'Member',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super administrator',
}

function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?'
}

export function UserMenu() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  if (status === 'loading') {
    return (
      <span
        aria-hidden="true"
        className="h-8 w-24 animate-pulse rounded-full bg-stone-200"
      />
    )
  }

  if (status === 'anonymous' || user === null) {
    return (
      <Link
        to="/sign-in"
        className={buttonStyles({ variant: 'secondary', size: 'sm' })}
      >
        Sign in
      </Link>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current)
        }}
        aria-expanded={open}
        aria-controls="account-panel"
        aria-label={`Account menu for ${user.displayName}`}
        className="flex items-center gap-2 rounded-full border border-archive-line bg-archive-surface py-1 pl-1 pr-3 text-sm font-medium text-archive-ink transition-colors hover:border-stone-300"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-archive-ink text-xs font-semibold text-archive-paper"
        >
          {initialsOf(user.displayName)}
        </span>
        <span className="hidden max-w-32 truncate sm:block">
          {user.displayName}
        </span>
      </button>

      {open ? (
        <div
          id="account-panel"
          aria-label="Account"
          className="absolute right-0 z-40 mt-2 w-64 space-y-2 rounded-xl border border-archive-line bg-archive-surface p-4 shadow-lg"
        >
          <div className="space-y-1">
            <p className="truncate text-sm font-semibold text-archive-ink">
              {user.displayName}
            </p>
            <p className="truncate text-xs text-archive-muted">{user.email}</p>
            <Badge tone="accent">{roleLabels[user.role]}</Badge>
          </div>

          <div className="space-y-1 border-t border-archive-line pt-2 text-sm">
            <Link
              to="/dashboard"
              onClick={() => {
                setOpen(false)
              }}
              className="block rounded px-2 py-1.5 text-archive-muted hover:bg-stone-100 hover:text-archive-ink"
            >
              My dashboard
            </Link>
            <Link
              to="/dashboard/uploads"
              onClick={() => {
                setOpen(false)
              }}
              className="block rounded px-2 py-1.5 text-archive-muted hover:bg-stone-100 hover:text-archive-ink"
            >
              My uploads
            </Link>
            <Link
              to="/dashboard/profile"
              onClick={() => {
                setOpen(false)
              }}
              className="block rounded px-2 py-1.5 text-archive-muted hover:bg-stone-100 hover:text-archive-ink"
            >
              Profile
            </Link>
            {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? (
              <Link
                to="/admin"
                onClick={() => {
                  setOpen(false)
                }}
                className="block rounded px-2 py-1.5 text-archive-muted hover:bg-stone-100 hover:text-archive-ink"
              >
                Administration
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await logout()
                  } finally {
                    setOpen(false)
                    void navigate('/', { replace: true })
                  }
                })()
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-archive-danger hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
