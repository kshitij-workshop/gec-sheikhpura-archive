import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '../../lib/api/types'
import { pageOf } from '../../test/fetchStub'
import {
  makeRemovalRequest,
  makeSubmission,
  makeSuggestion,
  makeUserPhoto,
} from '../../test/archiveFixtures'
import {
  authForRole,
  makeAuth,
  makeUser,
  renderApp,
} from '../../test/renderApp'
import {
  createSuggestion,
  listMyPhotos,
  listMySuggestions,
  listSubmissions,
  requestRemoval,
} from '../../lib/api/contributionApi'
import { updateProfile } from '../../lib/api/accountApi'

vi.mock('../../lib/api/contributionApi', () => ({
  createSubmission: vi.fn(),
  authorizeUpload: vi.fn(),
  registerPhoto: vi.fn(),
  listSubmissions: vi.fn(),
  listMyPhotos: vi.fn(),
  listMySuggestions: vi.fn(),
  requestRemoval: vi.fn(),
  createSuggestion: vi.fn(),
}))

vi.mock('../../lib/api/accountApi', () => ({
  updateProfile: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listMyPhotos).mockResolvedValue(pageOf())
  vi.mocked(listSubmissions).mockResolvedValue(pageOf())
  vi.mocked(listMySuggestions).mockResolvedValue(pageOf())
})

describe('dashboard overview', () => {
  it('summarises contributions and shows recent activity', async () => {
    vi.mocked(listMyPhotos).mockResolvedValue(
      pageOf([makeUserPhoto()], { totalElements: 3 }),
    )
    vi.mocked(listSubmissions).mockResolvedValue(
      pageOf([makeSubmission()], { totalElements: 1 }),
    )
    vi.mocked(listMySuggestions).mockResolvedValue(
      pageOf([], { totalElements: 0, totalPages: 0 }),
    )

    renderApp({ path: '/dashboard', auth: authForRole('USER') })

    expect(
      await screen.findByRole('heading', { name: 'Your dashboard' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('3 photographs')).toBeInTheDocument()
    expect(screen.getByText('1 submission')).toBeInTheDocument()
    expect(screen.getByText('0 suggestions')).toBeInTheDocument()
    expect(screen.getByText('Recent uploads')).toBeInTheDocument()
    expect(screen.getByText('Asha Verma · added 15 February 2026')).toBeInTheDocument()
  })
})

describe('my uploads', () => {
  it('requests removal with a reason and marks the request pending', async () => {
    const user = userEvent.setup()
    const photo = makeUserPhoto()
    vi.mocked(listMyPhotos).mockResolvedValue(pageOf([photo]))
    vi.mocked(requestRemoval).mockResolvedValue(makeRemovalRequest())

    renderApp({ path: '/dashboard/uploads', auth: authForRole('USER') })

    expect(
      await screen.findByRole('heading', { name: 'My uploads' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Opening ceremony')).toBeInTheDocument()
    expect(screen.getByText('Photographer credits:')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Request removal' }))

    expect(
      screen.getByRole('heading', { name: 'Request photograph removal' }),
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Reason'),
      'The photograph identifies a student without consent.',
    )
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(requestRemoval).toHaveBeenCalledWith(
        photo.id,
        'The photograph identifies a student without consent.',
      )
    })
    expect(
      await screen.findByText('Removal request sent. A moderator will review it; the photograph stays visible until then.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Removal request pending review.'),
    ).toBeInTheDocument()
  })
})

describe('submissions', () => {
  it('lists submission batches and their review state', async () => {
    vi.mocked(listSubmissions).mockResolvedValue(
      pageOf([makeSubmission()]),
    )

    renderApp({ path: '/dashboard/submissions', auth: authForRole('USER') })

    expect(
      await screen.findByRole('heading', { name: 'Submissions' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Founders Day')).toBeInTheDocument()
    expect(screen.getByText('Annual Sports Day')).toBeInTheDocument()
    expect(screen.getByText('Pending review')).toBeInTheDocument()
    expect(
      screen.getByText('Photographs from the main lawn.'),
    ).toBeInTheDocument()
  })
})

describe('event suggestions', () => {
  it('sends a suggestion with optional context left empty', async () => {
    const user = userEvent.setup()
    vi.mocked(listMySuggestions).mockResolvedValue(pageOf())
    vi.mocked(createSuggestion).mockResolvedValue(makeSuggestion())

    renderApp({ path: '/dashboard/suggestions', auth: authForRole('USER') })

    await user.click(
      await screen.findByRole('button', { name: 'Suggest an event' }),
    )
    await user.type(screen.getByLabelText('Event title'), 'Founders Day')
    await user.click(screen.getByRole('button', { name: 'Send suggestion' }))

    expect(createSuggestion).toHaveBeenCalledWith({
      title: 'Founders Day',
      description: null,
      approximateDate: null,
      categoryId: null,
      academicYearId: null,
    })
    expect(
      await screen.findByText('“Founders Day” was sent for review.'),
    ).toBeInTheDocument()
  })

  it('requires a title before sending', async () => {
    const user = userEvent.setup()
    renderApp({ path: '/dashboard/suggestions', auth: authForRole('USER') })

    await user.click(
      await screen.findByRole('button', { name: 'Suggest an event' }),
    )
    await user.click(screen.getByRole('button', { name: 'Send suggestion' }))

    expect(
      await screen.findByText('Give the suggested event a title.'),
    ).toBeInTheDocument()
    expect(createSuggestion).not.toHaveBeenCalled()
  })
})

describe('profile', () => {
  it('saves the display name through the cached session', async () => {
    const user = userEvent.setup()
    const updated = makeUser({ displayName: 'Asha V. Rao' })
    const setUser = vi.fn<(user: User) => void>()
    vi.mocked(updateProfile).mockResolvedValue(updated)

    renderApp({
      path: '/dashboard/profile',
      auth: makeAuth({
        status: 'authenticated',
        user: makeUser(),
        setUser,
      }),
    })

    const field = await screen.findByLabelText('Display name')
    await user.clear(field)
    await user.type(field, 'Asha V. Rao')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(updateProfile).toHaveBeenCalledWith('Asha V. Rao')
    expect(setUser).toHaveBeenCalledWith(updated)
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })
})
