import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getModerationHistory,
  listAdminAlbums,
  listAdminEvents,
  listModerationQueue,
  moderatePhoto,
  updatePhoto,
} from '../../lib/api/adminApi'
import { pageOf } from '../../test/fetchStub'
import {
  makeAdminAlbum,
  makeEvent,
  makeModerationHistoryEntry,
  makeModerationPhoto,
} from '../../test/archiveFixtures'
import { authForRole, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/adminApi', () => ({
  listModerationQueue: vi.fn(),
  getModerationHistory: vi.fn(),
  moderatePhoto: vi.fn(),
  listAdminAlbums: vi.fn(),
  listAdminEvents: vi.fn(),
  updatePhoto: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listModerationQueue).mockResolvedValue(pageOf())
  vi.mocked(getModerationHistory).mockResolvedValue([])
  vi.mocked(listAdminAlbums).mockResolvedValue([])
  vi.mocked(listAdminEvents).mockResolvedValue(pageOf([makeEvent()]))
})

describe('moderation queue', () => {
  it('loads pending photographs with their archive context', async () => {
    vi.mocked(listModerationQueue).mockResolvedValue(
      pageOf([makeModerationPhoto()]),
    )

    renderApp({ path: '/admin/moderation', auth: authForRole('ADMIN') })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Moderation queue' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Opening ceremony')).toBeInTheDocument()
    expect(
      screen.getByText('Founders Day · Annual Sports Day'),
    ).toBeInTheDocument()
    const results = within(
      document.getElementById('moderation-results') as HTMLElement,
    )
    expect(results.getByText('Pending review')).toBeInTheDocument()
    expect(results.getAllByText('Asha Verma').length).toBeGreaterThan(0)

    expect(listModerationQueue).toHaveBeenCalledWith({
      status: 'PENDING',
      page: 0,
      size: 10,
    })
  })

  it('reads the status filter from the URL', async () => {
    renderApp({
      path: '/admin/moderation?status=FLAGGED',
      auth: authForRole('ADMIN'),
    })

    await screen.findByRole('heading', { level: 1, name: 'Moderation queue' })

    expect(screen.getByLabelText('Filter by status')).toHaveValue('FLAGGED')
    await waitFor(() => {
      expect(listModerationQueue).toHaveBeenCalledWith({
        status: 'FLAGGED',
        page: 0,
        size: 10,
      })
    })
  })

  it('explains an empty pending queue instead of pretending it failed', async () => {
    renderApp({ path: '/admin/moderation', auth: authForRole('ADMIN') })

    expect(
      await screen.findByText('The moderation queue is clear'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/every photograph stays private until it is approved/i),
    ).toBeInTheDocument()
  })

  it('requires a reason before rejecting a photograph', async () => {
    const user = userEvent.setup()
    const photo = makeModerationPhoto()
    vi.mocked(listModerationQueue).mockResolvedValue(pageOf([photo]))
    vi.mocked(moderatePhoto).mockResolvedValue(
      makeModerationPhoto({ status: 'REJECTED' }),
    )

    renderApp({ path: '/admin/moderation', auth: authForRole('ADMIN') })

    await user.click(
      await screen.findByRole('button', {
        name: 'Reject: Opening ceremony',
      }),
    )
    expect(
      screen.getByRole('heading', { name: 'Reject photograph' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    expect(
      await screen.findByText('Explain briefly why this action is needed.'),
    ).toBeInTheDocument()
    expect(moderatePhoto).not.toHaveBeenCalled()

    await user.type(
      screen.getByLabelText('Reason'),
      'The image duplicates another approved photograph.',
    )
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => {
      expect(moderatePhoto).toHaveBeenCalledWith(photo.id, 'reject', {
        reason: 'The image duplicates another approved photograph.',
      })
    })
    expect(
      await screen.findByText('“Opening ceremony” was rejected.'),
    ).toBeInTheDocument()
  })

  it('asks for an album only when approval needs one', async () => {
    const user = userEvent.setup()
    const photo = makeModerationPhoto({ albumId: null, albumTitle: null })
    const album = makeAdminAlbum()
    vi.mocked(listModerationQueue).mockResolvedValue(pageOf([photo]))
    vi.mocked(listAdminAlbums).mockResolvedValue([album])
    vi.mocked(moderatePhoto).mockResolvedValue(
      makeModerationPhoto({
        albumId: album.id,
        albumTitle: album.title,
        status: 'APPROVED',
      }),
    )

    renderApp({ path: '/admin/moderation', auth: authForRole('ADMIN') })

    expect(await screen.findByText(/no album assigned/i)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'Approve: Opening ceremony',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Approve photograph' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(
      await screen.findByText(
        'Choose the album that should hold this photograph.',
      ),
    ).toBeInTheDocument()
    expect(moderatePhoto).not.toHaveBeenCalled()

    await user.selectOptions(
      await screen.findByLabelText('Album'),
      album.id,
    )
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(moderatePhoto).toHaveBeenCalledWith(photo.id, 'approve', {
        albumId: album.id,
        eventId: photo.eventId,
        title: photo.title,
        caption: photo.caption,
        altText: photo.altText,
      })
    })
    expect(
      await screen.findByText(
        '“Opening ceremony” was approved and filed under Annual Sports Day.',
      ),
    ).toBeInTheDocument()
    expect(listAdminAlbums).toHaveBeenCalledWith(photo.eventId)
  })

  it('loads moderation history only when a moderator asks for it', async () => {
    const user = userEvent.setup()
    const photo = makeModerationPhoto()
    vi.mocked(listModerationQueue).mockResolvedValue(pageOf([photo]))
    vi.mocked(getModerationHistory).mockResolvedValue([
      makeModerationHistoryEntry(),
    ])

    renderApp({ path: '/admin/moderation', auth: authForRole('ADMIN') })

    await screen.findByText('Opening ceremony')
    expect(getModerationHistory).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: 'Show moderation history' }),
    )

    expect(await screen.findByText('Submitted')).toBeInTheDocument()
    expect(
      screen.getByText('Not recorded → Pending review'),
    ).toBeInTheDocument()
    expect(getModerationHistory).toHaveBeenCalledWith(photo.id)
  })

  it('lets a moderator correct the title and album while approving', async () => {
    const user = userEvent.setup()
    const photo = makeModerationPhoto()
    const album = makeAdminAlbum({ id: 'c3333333-3333-4333-8333-333333333333', title: 'Corrections' })
    vi.mocked(listModerationQueue).mockResolvedValue(pageOf([photo]))
    vi.mocked(listAdminAlbums).mockResolvedValue([album])
    vi.mocked(moderatePhoto).mockResolvedValue(
      makeModerationPhoto({ status: 'APPROVED', albumId: album.id, albumTitle: album.title }),
    )

    renderApp({ path: '/admin/moderation', auth: authForRole('ADMIN') })

    await user.click(
      await screen.findByRole('button', { name: 'Approve: Opening ceremony' }),
    )

    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Corrected ceremony title')
    await user.selectOptions(screen.getByLabelText('Album'), album.id)
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(moderatePhoto).toHaveBeenCalledWith(photo.id, 'approve', {
        albumId: album.id,
        eventId: photo.eventId,
        title: 'Corrected ceremony title',
        caption: photo.caption,
        altText: photo.altText,
      })
    })
    expect(
      await screen.findByText(
        '“Opening ceremony” was approved and filed under Corrections.',
      ),
    ).toBeInTheDocument()
  })

  it('edits an approved photograph without changing its status', async () => {
    const user = userEvent.setup()
    const photo = makeModerationPhoto({ status: 'APPROVED' })
    const album = makeAdminAlbum()
    vi.mocked(listModerationQueue).mockResolvedValue(pageOf([photo]))
    vi.mocked(listAdminAlbums).mockResolvedValue([album])
    vi.mocked(updatePhoto).mockResolvedValue(
      makeModerationPhoto({ status: 'APPROVED', title: 'Refiled title' }),
    )

    renderApp({ path: '/admin/moderation?status=APPROVED', auth: authForRole('ADMIN') })

    await user.click(
      await screen.findByRole('button', {
        name: 'Edit details: Opening ceremony',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Edit photograph details' }),
    ).toBeInTheDocument()

    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Refiled title')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updatePhoto).toHaveBeenCalledWith(photo.id, {
        albumId: album.id,
        eventId: photo.eventId,
        title: 'Refiled title',
        caption: photo.caption,
        altText: photo.altText,
      })
    })
    expect(
      await screen.findByText('“Opening ceremony” was updated.'),
    ).toBeInTheDocument()
  })
})
