import { useEffect, useRef } from 'react'

import { googleClientId } from '../../lib/config'
import { googleSignInMessage } from './authMessages'
import { useAuth } from './useAuth'

interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleIdentityApi {
  initialize(options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
}

interface GoogleIdentityGlobal {
  accounts?: { id?: GoogleIdentityApi }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/** One load per page, shared by every mount of the button. */
let scriptPromise: Promise<void> | null = null

function googleIdentity(): GoogleIdentityApi | null {
  const global = (window as unknown as { google?: GoogleIdentityGlobal }).google
  return global?.accounts?.id ?? null
}

function loadGoogleIdentity(): Promise<void> {
  if (googleIdentity() !== null) {
    return Promise.resolve()
  }
  if (scriptPromise !== null) {
    return scriptPromise
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      resolve()
    }
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('Google Identity Services could not be loaded.'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export interface GoogleSignInButtonProps {
  /** Called after the archive session is established. */
  onSuccess: () => void
  /** Called with an already-sanitised, user-facing message. */
  onError: (message: string) => void
}

/**
 * Renders Google's own sign-in button through Google Identity Services.
 *
 * <p>The browser receives a short-lived ID token and posts it to this archive,
 * which verifies it with Google's public keys. No access token, refresh token,
 * or client secret is shared with Google. When the deployment has no client ID
 * the component renders nothing, so unconfigured environments look unchanged.</p>
 */
export function GoogleSignInButton({
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth()
  const container = useRef<HTMLDivElement | null>(null)
  // Latest callbacks without re-initialising Google on every parent render.
  const handlers = useRef({ onSuccess, onError, loginWithGoogle })

  useEffect(() => {
    handlers.current = { onSuccess, onError, loginWithGoogle }
  }, [onSuccess, onError, loginWithGoogle])

  const clientId = googleClientId()

  useEffect(() => {
    if (clientId === '') {
      return
    }
    let cancelled = false

    void loadGoogleIdentity()
      .then(() => {
        if (cancelled) {
          return
        }
        const api = googleIdentity()
        const parent = container.current
        if (api === null || parent === null) {
          handlers.current.onError(
            'Google sign-in is unavailable right now. Use your email and password instead.',
          )
          return
        }

        api.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            const credential = response.credential
            if (credential === undefined || credential === '') {
              handlers.current.onError(
                'Google did not return a sign-in credential. Please try again.',
              )
              return
            }
            void handlers.current.loginWithGoogle(credential).then(
              () => {
                handlers.current.onSuccess()
              },
              (error: unknown) => {
                handlers.current.onError(googleSignInMessage(error))
              },
            )
          },
        })

        parent.replaceChildren()
        api.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        })
      })
      .catch(() => {
        if (!cancelled) {
          handlers.current.onError(
            'Google sign-in could not be loaded. Use your email and password instead.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [clientId])

  if (clientId === '') {
    return null
  }

  return (
    <div className="space-y-2">
      <div ref={container} className="flex min-h-11 justify-center" />
      <p className="text-center text-xs leading-relaxed text-archive-muted">
        Google shares only your name and verified email address with the
        archive.
      </p>
    </div>
  )
}
