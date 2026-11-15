import { describe, expect, it } from 'vitest'

import {
  formatCredits,
  formatEventDate,
  formatTimestamp,
} from './format'

describe('formatEventDate', () => {
  it('formats a calendar date without timezone shifts', () => {
    expect(formatEventDate('2026-02-14')).toBe('14 February 2026')
    expect(formatEventDate('2025-12-01')).toBe('1 December 2025')
  })

  it('returns the original value when the date is malformed', () => {
    expect(formatEventDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatTimestamp', () => {
  it('formats an instant and tolerates invalid input', () => {
    expect(formatTimestamp('2026-02-14T09:30:00Z')).toContain('2026')
    expect(formatTimestamp('nope')).toBe('nope')
  })
})

describe('formatCredits', () => {
  it('names one photographer', () => {
    expect(formatCredits(['Asha Verma'])).toBe('Asha Verma')
  })

  it('joins two photographers', () => {
    expect(formatCredits(['Asha Verma', 'Ravi Kumar'])).toBe(
      'Asha Verma and Ravi Kumar',
    )
  })

  it('joins three or more photographers in list form', () => {
    expect(formatCredits(['Asha', 'Ravi', 'Meera'])).toBe(
      'Asha, Ravi, and Meera',
    )
  })

  it('deduplicates and trims names', () => {
    expect(formatCredits([' Asha ', 'Asha', 'Ravi'])).toBe('Asha and Ravi')
  })

  it('never invents a credit when none was recorded', () => {
    expect(formatCredits([])).toBe('Photographer not recorded')
    expect(formatCredits(['   '])).toBe('Photographer not recorded')
  })
})
