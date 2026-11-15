import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('renders its label and handles clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Approve photograph</Button>)

    await user.click(screen.getByRole('button', { name: 'Approve photograph' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('defaults to type button so it never submits a form accidentally', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('blocks interaction and announces work while loading', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Publishing
      </Button>,
    )

    const button = screen.getByRole('button', { name: /Publishing/ })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Loading')

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
