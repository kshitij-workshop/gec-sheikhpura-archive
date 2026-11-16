export const appConfig = {
  name: 'GEC Sheikhpura Archive',
  shortName: 'GEC Archive',
  phase: 'Phase 09',
} as const

/**
 * Public Google OAuth client ID for Google Identity Services.
 *
 * Read at call time so tests can stub the environment. An empty value keeps
 * Google sign-in entirely hidden, which is how an unconfigured deployment
 * behaves.
 */
export function googleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
}
