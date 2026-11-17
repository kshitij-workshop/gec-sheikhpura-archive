import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '../../../app/providers'
import { AuthContext } from '../../auth/authContext'
import type { AuthState } from '../../auth/authContext'
import type { PhotoReport } from '../../../lib/api/types'
import { reportPhoto, requestRemoval } from '../../../lib/api/contributionApi'
import { makePhoto } from '../../../test/archiveFixtures'
import { anonymousAuth, authForRole } from '../../../test/renderApp'
import { PhotoActions } from './PhotoActions'

vi.mock('../../../lib/api/contributionApi', () => ({
  reportPhoto: vi.fn(),
  requestRemoval: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(reportPhoto).mockResolvedValue({
    id: 'r1',
    photoId: makePhoto().id,
    reportedByUserId: 'u1',
    category: 'PRIVACY',
    details: null,
    status: 'PENDING',
    resolutionNote: null,
    handledByUserId: null,
    handledAt: null,
    createdAt: '2026-03-01T10:00:00Z',
  } satisfies PhotoReport)
  vi.mocked(requestRemoval).mockResolvedValue({
    id: 'rr1',
    photoId: makePhoto().id,
    requestedByUserId: 'u1',
    reason: 'Someone is identifiable without consent.',
    status: 'PENDING',
    resolutionNote: null,
    handledByUserId: null,
    handledAt: null,
    createdAt: '2026-03-01T10:00:00Z',
  })
})

function renderActions(
  photo: Parameters<typeof PhotoActions>[0]['photo'],
  auth: AuthState,
) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={['/albums/annual-sports-day']}>
        <AuthContext.Provider value={auth}>
          <PhotoActions photo={photo} />
        </AuthContext.Provider>
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('photo actions', () => {
  it('offers guests a sign-in route instead of a report form', () => {
    renderActions(makePhoto(), anonymousAuth)

    expect(
      screen.getByRole('link', { name: /sign in to report/i }),
    ).toHaveAttribute('href', '/sign-in')
    expect(screen.queryByRole('button', { name: /report/i })).toBeNull()
  })

  it('files a report with a category and details', async () => {
    const user = userEvent.setup()
    const photo = makePhoto()

    renderActions(photo, authForRole('USER'))

    await user.click(screen.getByRole('button', { name: /report/i }))
    expect(
      screen.getByRole('heading', { name: 'Report this photograph' }),
    ).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Reason'), 'PRIVACY')
    await user.type(
      screen.getByLabelText('Details'),
      'A student is identifiable without consent.',
    )
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    await waitFor(() => {
      expect(reportPhoto).toHaveBeenCalledWith(photo.id, {
        category: 'PRIVACY',
        details: 'A student is identifiable without consent.',
      })
    })
    expect(
      await screen.findByText('Report sent for review.'),
    ).toBeInTheDocument()
  })

  it('shows the removal action only to the uploader', () => {
    renderActions(makePhoto(), authForRole('USER'))

    expect(
      screen.queryByRole('button', { name: /request removal/i }),
    ).toBeNull()
  })

  it('lets the uploader request removal from the public photograph', async () => {
    const user = userEvent.setup()
    const photo = makePhoto({ viewerCanRequestRemoval: true })

    renderActions(photo, authForRole('USER'))

    await user.click(
      screen.getByRole('button', { name: /request removal/i }),
    )
    await user.type(
      screen.getByLabelText('Reason for removal'),
      'Someone is identifiable without consent.',
    )
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(requestRemoval).toHaveBeenCalledWith(
        photo.id,
        'Someone is identifiable without consent.',
      )
    })
    expect(
      await screen.findByText('Removal request pending review.'),
    ).toBeInTheDocument()
  })
})
