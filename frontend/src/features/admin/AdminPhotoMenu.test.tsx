import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '../../app/providers'
import { AuthContext } from '../auth/authContext'
import type { AuthState } from '../auth/authContext'
import {
  getAdminPhoto,
  listAdminAlbums,
  listAdminEvents,
  moderatePhoto,
  updatePhoto,
} from '../../lib/api/adminApi'
import {
  makeAdminAlbum,
  makeEvent,
  makeModerationPhoto,
} from '../../test/archiveFixtures'
import { pageOf } from '../../test/fetchStub'
import { anonymousAuth, authForRole } from '../../test/renderApp'
import { AdminPhotoMenu } from './AdminPhotoMenu'

vi.mock('../../lib/api/adminApi', () => ({
  getAdminPhoto: vi.fn(),
  listModerationQueue: vi.fn(),
  getModerationHistory: vi.fn(),
  moderatePhoto: vi.fn(),
  listAdminAlbums: vi.fn(),
  listAdminEvents: vi.fn(),
  updatePhoto: vi.fn(),
}))

const photo = makeModerationPhoto({ status: 'APPROVED' })

function renderMenu(auth: AuthState) {
  return render(
    <AppProviders>
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <AdminPhotoMenu
            photoId={photo.id}
            photoTitle={photo.title}
            compact
          />
        </AuthContext.Provider>
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAdminPhoto).mockResolvedValue(photo)
  vi.mocked(moderatePhoto).mockResolvedValue(
    makeModerationPhoto({ status: 'HIDDEN' }),
  )
  vi.mocked(updatePhoto).mockResolvedValue(makeModerationPhoto())
  vi.mocked(listAdminEvents).mockResolvedValue(pageOf([makeEvent()]))
  vi.mocked(listAdminAlbums).mockResolvedValue([makeAdminAlbum()])
})

describe('admin photo menu', () => {
  it('is hidden from guests and members', () => {
    const guest = renderMenu(anonymousAuth)
    expect(screen.queryByRole('button', { name: /manage/i })).toBeNull()
    guest.unmount()

    renderMenu(authForRole('USER'))
    expect(screen.queryByRole('button', { name: /manage/i })).toBeNull()
    expect(getAdminPhoto).not.toHaveBeenCalled()
  })

  it('lets an administrator hide a published photograph with a reason', async () => {
    const user = userEvent.setup()
    renderMenu(authForRole('ADMIN'))

    await user.click(
      screen.getByRole('button', { name: `Manage ${photo.title ?? ''}` }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Manage photograph' }),
    ).toBeInTheDocument()
    expect(getAdminPhoto).toHaveBeenCalledWith(photo.id)

    await user.click(
      screen.getByRole('button', { name: `Hide: ${photo.title ?? ''}` }),
    )

    expect(
      screen.getByRole('heading', { name: 'Hide photograph' }),
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Reason'),
      'The subject asked for it to be taken down.',
    )
    await user.click(screen.getByRole('button', { name: 'Hide' }))

    await waitFor(() => {
      expect(moderatePhoto).toHaveBeenCalledWith(photo.id, 'hide', {
        reason: 'The subject asked for it to be taken down.',
      })
    })
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Hide photograph' }),
      ).not.toBeInTheDocument()
    })
  })

  it('lets an administrator correct a photograph from the public page', async () => {
    const user = userEvent.setup()
    renderMenu(authForRole('ADMIN'))

    await user.click(
      screen.getByRole('button', { name: `Manage ${photo.title ?? ''}` }),
    )
    await user.click(
      await screen.findByRole('button', {
        name: `Edit details: ${photo.title ?? ''}`,
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Edit photograph details' }),
    ).toBeInTheDocument()

    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'A corrected title')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updatePhoto).toHaveBeenCalledWith(
        photo.id,
        expect.objectContaining({
          albumId: photo.albumId,
          eventId: photo.eventId,
          title: 'A corrected title',
        }),
      )
    })
  })
})
