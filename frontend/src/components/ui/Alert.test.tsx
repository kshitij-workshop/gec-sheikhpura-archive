import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Alert } from './Alert'
import { Badge } from './Badge'

describe('Alert', () => {
  it('announces errors immediately', () => {
    render(
      <Alert tone="danger" title="Upload rejected">
        The file is larger than 15 MB.
      </Alert>,
    )

    const alert = screen.getByRole('alert')

    expect(alert).toHaveTextContent('Upload rejected')
    expect(alert).toHaveTextContent('The file is larger than 15 MB.')
  })

  it('uses a polite status for informational messages', () => {
    render(<Alert tone="success">Submission received.</Alert>)

    expect(screen.getByRole('status')).toHaveTextContent('Submission received.')
  })
})

describe('Badge', () => {
  it('renders its tone and contents', () => {
    render(<Badge tone="warning">Pending review</Badge>)

    const badge = screen.getByText('Pending review')

    expect(badge).toHaveClass('bg-archive-warning-soft')
  })
})
