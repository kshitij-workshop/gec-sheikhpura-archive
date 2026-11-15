/**
 * Client-side mirror of the server password policy.
 *
 * This exists to give immediate feedback, not to enforce anything: the API
 * validates every password again and remains the security boundary. Keeping
 * the wording aligned avoids a confusing round trip for obvious mistakes.
 */
const MIN_LENGTH = 12
const MAX_LENGTH = 128

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'password1234',
  '123456789012',
  '1234567890123',
  'qwertyuiop12',
  'qwerty123456',
  'letmein12345',
  'welcome12345',
  'admin1234567',
  'iloveyou1234',
  'abc123456789',
  'changeme1234',
])

export interface PasswordContext {
  email?: string
  displayName?: string
}

/** Returns a human-readable problem, or `null` when the password is usable. */
export function passwordProblem(
  password: string,
  context: PasswordContext = {},
): string | null {
  if (password.length < MIN_LENGTH) {
    return `Use at least ${String(MIN_LENGTH)} characters.`
  }
  if (password.length > MAX_LENGTH) {
    return `Use at most ${String(MAX_LENGTH)} characters.`
  }
  if (!/[a-z]/i.test(password)) {
    return 'Include at least one letter.'
  }
  if (!/\d/.test(password)) {
    return 'Include at least one number.'
  }
  if (new Set(password).size === 1) {
    return 'Do not repeat a single character.'
  }

  const normalized = password.toLowerCase()

  if (COMMON_PASSWORDS.has(normalized)) {
    return 'Choose a less common password.'
  }
  if (context.email && normalized === context.email.trim().toLowerCase()) {
    return 'Do not use your email address as the password.'
  }
  if (
    context.displayName &&
    normalized === context.displayName.trim().toLowerCase()
  ) {
    return 'Do not use your display name as the password.'
  }

  return null
}
