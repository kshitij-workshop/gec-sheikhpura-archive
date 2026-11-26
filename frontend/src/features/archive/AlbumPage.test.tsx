import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  makeAlbum,
  makePhoto,
} from '../../test/archiveFixtures'
import { jsonResponse, pageOf, requestPath } from '../../test/fetchStub'
import { authForRole, renderApp } from '../../test/renderApp'

beforeEach(() => {
  vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'gecs-demo')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function stubAlbum() {
  const album = makeAlbum({
    photos: pageOf([
      makePhoto(),
      makePhoto({
        id: '88888888-8888-4888-8888-888888888888',
        title: 'Closing address',
        altText: 'The principal speaking at the closing address',
        caption: 'The principal closes the ceremony.',
        cloudinaryPublicId: 'gecs/closing-address',
        photographers: [{ creditName: 'Ravi Kumar', creditOrder: 0 }],
      }),
    ]),
  })

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input)
      if (path.includes('/albums/slug/')) {
        return Promise.resolve(jsonResponse(album))
      }
      return Promise.resolve(jsonResponse({ title: 'Not Found' }, 404))
    }),
  )
}

describe('AlbumPage', () => {
  it('renders approved photographs with attribution and a breadcrumb', async () => {
    stubAlbum()

    renderApp({ path: '/albums/annual-sports-day' })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Annual Sports Day',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Founders Day' }),
    ).toHaveAttribute('href', '/events/founders-day')
    expect(
      screen.getByText('2 approved photographs'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'View Opening ceremony' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Asha Verma/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /students gathered/i })).toHaveAttribute(
      'src',
      expect.stringContaining('res.cloudinary.com/gecs-demo'),
    )
  })

  it('presents each photograph as a framed print with a caption', async () => {
    stubAlbum()

    renderApp({ path: '/albums/annual-sports-day' })

    const view = await screen.findByRole('button', {
      name: 'View Opening ceremony',
    })
    const figure = view.closest('figure')

    expect(figure).not.toBeNull()
    // The print sits inside a framed matte.
    expect(figure).toHaveClass('bg-archive-surface/50')
    expect(within(figure!).getByText('Opening ceremony')).toBeInTheDocument()
    expect(within(figure!).getByText('Asha Verma')).toBeInTheDocument()
  })

  it('opens the viewer and moves between photographs with the keyboard', async () => {
    const user = userEvent.setup()
    stubAlbum()

    renderApp({ path: '/albums/annual-sports-day' })

    await user.click(
      await screen.findByRole('button', { name: 'View Opening ceremony' }),
    )

    const dialog = screen.getByText('1 of 2').closest('dialog')
    expect(dialog).not.toBeNull()

    expect(
      within(dialog!).getByRole('heading', {
        level: 2,
        name: 'Opening ceremony',
      }),
    ).toBeInTheDocument()
    expect(
      within(dialog!).getByText(/The ceremony begins on the main lawn/),
    ).toBeInTheDocument()

    fireEvent.keyDown(dialog!, { key: 'ArrowRight' })

    expect(within(dialog!).getByText('2 of 2')).toBeInTheDocument()
    expect(within(dialog!).getByText(/Ravi Kumar/)).toBeInTheDocument()
    expect(within(dialog!).getByText(/Closing address/)).toBeInTheDocument()

    fireEvent.keyDown(dialog!, { key: 'Escape' })

    expect(screen.queryByText('2 of 2')).not.toBeInTheDocument()
  })

  it('keeps the viewer open when a nested report dialog is dismissed', async () => {
    const user = userEvent.setup()
    stubAlbum()

    renderApp({
      path: '/albums/annual-sports-day',
      auth: authForRole('USER'),
    })

    await user.click(
      await screen.findByRole('button', { name: 'View Opening ceremony' }),
    )
    const viewer = screen.getByText('1 of 2').closest('dialog')
    expect(viewer).not.toBeNull()

    await user.click(within(viewer!).getByRole('button', { name: /report/i }))

    const heading = screen.getByRole('heading', {
      name: 'Report this photograph',
    })
    const reportDialog = heading.closest('dialog')
    expect(reportDialog).toHaveAttribute('open')

    fireEvent.keyDown(heading, { key: 'Escape' })

    expect(
      screen.queryByRole('heading', { name: 'Report this photograph' }),
    ).not.toBeInTheDocument()
    expect(viewer).toHaveAttribute('open')
    expect(within(viewer!).getByText('1 of 2')).toBeInTheDocument()
  })

  it('shows a clear not-found state for an unavailable album', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            { title: 'Not Found', detail: 'Album not found.' },
            404,
          ),
        ),
      ),
    )

    renderApp({ path: '/albums/missing-album' })

    expect(
      await screen.findByText('This album is not in the public archive'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Browse the archive' }),
    ).toHaveAttribute('href', '/archive')
  })
})
