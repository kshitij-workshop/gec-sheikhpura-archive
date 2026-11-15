import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Dialog } from './Dialog'

describe('Dialog', () => {
  it('opens as a modal dialog and exposes its title', () => {
    render(
      <Dialog open onClose={() => undefined} title="Remove photograph">
        <p>The photograph will leave the public archive.</p>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Remove photograph' })

    expect(dialog).toHaveAttribute('open')
    expect(
      screen.getByText('The photograph will leave the public archive.'),
    ).toBeVisible()
  })

  it('closes through the close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Confirm">
        Body
      </Dialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Confirm">
        Body
      </Dialog>,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('removes the open attribute when closed', () => {
    const { rerender } = render(
      <Dialog open onClose={() => undefined} title="Confirm">
        Body
      </Dialog>,
    )

    rerender(
      <Dialog open={false} onClose={() => undefined} title="Confirm">
        Body
      </Dialog>,
    )

    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute(
      'open',
    )
  })

  it('renders footer actions when provided', () => {
    render(
      <Dialog
        open
        onClose={() => undefined}
        title="Confirm"
        footer={<button type="button">Delete</button>}
      >
        Body
      </Dialog>,
    )

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})
