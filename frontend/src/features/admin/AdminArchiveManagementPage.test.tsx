import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  listAdminAlbums,
  listAdminCategories,
  listAdminEvents,
  listAdminYears,
  updateAdminAlbum,
} from '../../lib/api/adminApi'
import {
  makeAdminAlbum,
  makeCategory,
  makeEvent,
  makeYear,
} from '../../test/archiveFixtures'
import { pageOf } from '../../test/fetchStub'
import { authForRole, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/adminApi', () => ({
  listAdminYears: vi.fn(),
  listAdminCategories: vi.fn(),
  listAdminEvents: vi.fn(),
  listAdminAlbums: vi.fn(),
  createAdminYear: vi.fn(),
  createAdminCategory: vi.fn(),
  createAdminEvent: vi.fn(),
  createAdminAlbum: vi.fn(),
  updateAdminEvent: vi.fn(),
  updateAdminAlbum: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listAdminYears).mockResolvedValue([makeYear()])
  vi.mocked(listAdminCategories).mockResolvedValue([makeCategory()])
  vi.mocked(listAdminEvents).mockResolvedValue(pageOf([makeEvent()]))
  vi.mocked(listAdminAlbums).mockResolvedValue([makeAdminAlbum()])
})

describe('archive management', () => {
  it('renames an album and keeps its public slug', async () => {
    vi.mocked(updateAdminAlbum).mockResolvedValue(
      makeAdminAlbum({ title: '2K24 Batch' }),
    )

    renderApp({ path: '/admin/archive', auth: authForRole('ADMIN') })

    const [editAlbum] = await screen.findAllByRole('button', {
      name: 'Edit album',
    })
    await userEvent.click(editAlbum!)

    const title = await screen.findByLabelText('Album title')
    await userEvent.clear(title)
    await userEvent.type(title, '2K24 Batch')
    await userEvent.click(screen.getByRole('button', { name: 'Save album' }))

    expect(updateAdminAlbum).toHaveBeenCalledWith(
      makeAdminAlbum().id,
      expect.objectContaining({
        eventId: makeEvent().id,
        title: '2K24 Batch',
        published: true,
      }),
    )
    expect(vi.mocked(updateAdminAlbum).mock.calls[0]![1]).not.toHaveProperty(
      'slug',
    )
  })

  it('edits event details without changing publication state', async () => {
    renderApp({ path: '/admin/archive', auth: authForRole('ADMIN') })

    const [editEvent] = await screen.findAllByRole('button', {
      name: 'Edit details',
    })
    await userEvent.click(editEvent!)

    expect(await screen.findByLabelText('Event title')).toHaveValue(
      'Founders Day',
    )
    const form = screen
      .getByRole('button', { name: 'Save event' })
      .closest('form')!
    expect(within(form).getByLabelText('Location')).toHaveValue('Main Campus')
    expect(
      screen.getByText('Public link: /archive/events/founders-day'),
    ).toBeInTheDocument()
  })
})
