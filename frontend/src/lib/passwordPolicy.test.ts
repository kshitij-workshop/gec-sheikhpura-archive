import { describe, expect, it } from 'vitest'

import { passwordProblem } from './passwordPolicy'

describe('passwordProblem', () => {
  it('accepts a password that meets the server policy', () => {
    expect(passwordProblem('ArchivePass1234')).toBeNull()
  })

  it('requires at least twelve characters', () => {
    expect(passwordProblem('Short1234')).toMatch(/at least 12/)
  })

  it('requires a letter and a number', () => {
    expect(passwordProblem('123456789012')).toMatch(/letter/)
    expect(passwordProblem('onlylettershere')).toMatch(/number/)
  })

  it('rejects common passwords and account identifiers', () => {
    expect(passwordProblem('password1234')).toMatch(/common/)
    expect(
      passwordProblem('asha123@example.edu', {
        email: 'asha123@example.edu',
      }),
    ).toMatch(/email address/)
    expect(
      passwordProblem('asha123verma', { displayName: 'asha123verma' }),
    ).toMatch(/display name/)
  })

  it('rejects an overlong password', () => {
    expect(passwordProblem(`A1${'x'.repeat(130)}`)).toMatch(/at most 128/)
  })
})
