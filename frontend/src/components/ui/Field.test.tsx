import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SelectField, TextAreaField, TextField } from './Field'

describe('form fields', () => {
  it('associates a label and hint with the input', () => {
    render(
      <TextField
        label="Email address"
        hint="We only use this to contact you about submissions."
        type="email"
      />,
    )

    const input = screen.getByLabelText('Email address')

    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAccessibleDescription(
      'We only use this to contact you about submissions.',
    )
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('announces invalid fields and their error message', () => {
    render(
      <TextField
        label="Display name"
        hint="Shown beside your photographs."
        error="Display name is required."
      />,
    )

    const input = screen.getByLabelText('Display name')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'Shown beside your photographs. Display name is required.',
    )
    expect(screen.getByText('Display name is required.')).toHaveAttribute(
      'id',
      `${input.id}-error`,
    )
  })

  it('marks optional fields and renders a textarea', () => {
    render(
      <TextAreaField label="Photographer credit" optional rows={6} />,
    )

    expect(screen.getByLabelText('Photographer credit')).toHaveAttribute(
      'rows',
      '6',
    )
    expect(screen.getByText('Optional')).toBeInTheDocument()
  })

  it('wires a select control with its options', () => {
    render(
      <SelectField label="Album" defaultValue="annual-day">
        <option value="annual-day">Annual day</option>
        <option value="sports">Sports meet</option>
      </SelectField>,
    )

    expect(screen.getByLabelText('Album')).toHaveValue('annual-day')
    expect(
      screen.getByRole('option', { name: 'Sports meet' }),
    ).toBeInTheDocument()
  })

  it('uses a caller-supplied id when provided', () => {
    render(<TextField id="search-events" label="Search events" />)

    expect(screen.getByLabelText('Search events')).toHaveAttribute(
      'id',
      'search-events',
    )
  })
})
