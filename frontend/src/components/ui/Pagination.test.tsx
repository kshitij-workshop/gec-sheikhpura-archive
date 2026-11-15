import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './Pagination'
import { buildPageItems } from './paginationRange'

describe('Pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(
      <Pagination page={0} totalPages={1} onPageChange={() => undefined} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('marks the current page and disables the previous control', () => {
    render(<Pagination page={0} totalPages={3} onPageChange={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('requests the neighbouring page', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenCalledWith(0)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables every control while a page request is in flight', () => {
    render(
      <Pagination
        page={1}
        totalPages={3}
        onPageChange={() => undefined}
        disabled
      />,
    )

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})

describe('buildPageItems', () => {
  it('lists every page when the range is short', () => {
    expect(buildPageItems(2, 5)).toEqual([0, 1, 2, 3, 4])
  })

  it('keeps the first, last, and neighbouring pages', () => {
    expect(buildPageItems(5, 10)).toEqual([
      0,
      'gap-right',
      4,
      5,
      6,
      'gap-right',
      9,
    ])
  })

  it('fills a single-page gap instead of collapsing it', () => {
    expect(buildPageItems(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('clamps out-of-range values', () => {
    expect(buildPageItems(-4, 0)).toEqual([0])
    expect(buildPageItems(99, 3)).toEqual([0, 1, 2])
  })
})
