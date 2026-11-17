import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeUpload,
  createSubmission,
  registerPhoto,
} from '../../lib/api/contributionApi'
import { uploadImageToCloudinary } from '../../lib/cloudinaryUpload'
import {
  makeEvent,
  makeRegisteredPhoto,
  makeSubmission,
  makeUploadAuthorization,
} from '../../test/archiveFixtures'
import { jsonResponse, pageOf, requestPath } from '../../test/fetchStub'
import { authForRole, renderApp } from '../../test/renderApp'

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

vi.mock('../../lib/cloudinaryUpload', () => ({
  uploadImageToCloudinary: vi.fn(),
}))

const event = makeEvent()
const album = event.albums[0]!
const batch = makeSubmission()

function stubPublishedEvents(listedEvent: ReturnType<typeof makeEvent> = event) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input)

      if (path.endsWith('/events')) {
        return Promise.resolve(jsonResponse(pageOf([listedEvent])))
      }

      return Promise.resolve(jsonResponse({ title: 'Not Found' }, 404))
    }),
  )
}

function photoFile(): File {
  return new File([new Uint8Array(32)], 'sports-day.jpg', {
    type: 'image/jpeg',
  })
}

async function chooseEventAndAddFile(
  user: ReturnType<typeof userEvent.setup>,
  options: { album?: boolean } = {},
) {
  renderApp({ path: '/contribute', auth: authForRole('USER') })

  await user.selectOptions(await screen.findByLabelText('Event'), event.id)
  if (options.album !== false) {
    await user.selectOptions(screen.getByLabelText('Album'), album.id)
  }
  await user.upload(screen.getByLabelText('Photographs'), photoFile())
  await screen.findByText('sports-day.jpg')
}

beforeEach(() => {
  vi.clearAllMocks()
  stubPublishedEvents()
})

describe('contribute upload flow', () => {
  it('creates one submission and registers each described photograph', async () => {
    const user = userEvent.setup()
    const authorization = makeUploadAuthorization()
    vi.mocked(createSubmission).mockResolvedValue(batch)
    vi.mocked(authorizeUpload).mockResolvedValue(authorization)
    vi.mocked(uploadImageToCloudinary).mockResolvedValue(
      authorization.publicId,
    )
    vi.mocked(registerPhoto).mockResolvedValue(makeRegisteredPhoto())

    await chooseEventAndAddFile(user)
    await user.type(
      screen.getByLabelText('Photographer credit'),
      'Asha Verma',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Create submission and upload 1 photograph',
      }),
    )

    await waitFor(() => {
      expect(createSubmission).toHaveBeenCalledWith({
        eventId: event.id,
        albumId: album.id,
        note: null,
      })
    })
    expect(await screen.findByText('Registered for review')).toBeInTheDocument()
    expect(authorizeUpload).toHaveBeenCalledWith(batch.id)
    expect(uploadImageToCloudinary).toHaveBeenCalledWith(
      expect.any(File),
      authorization,
    )
    expect(registerPhoto).toHaveBeenCalledWith(
      batch.id,
      expect.objectContaining({
        authorizationId: authorization.authorizationId,
        publicId: authorization.publicId,
        title: null,
        takenAt: null,
        photographers: [{ creditName: 'Asha Verma' }],
      }),
    )
  })

  it('refuses to submit without an album', async () => {
    const user = userEvent.setup()
    await chooseEventAndAddFile(user, { album: false })
    await user.type(
      screen.getByLabelText('Photographer credit'),
      'Asha Verma',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Create submission and upload 1 photograph',
      }),
    )

    expect(
      (await screen.findAllByText('Choose the album these photographs belong to.'))
        .length,
    ).toBeGreaterThan(0)
    expect(createSubmission).not.toHaveBeenCalled()
    expect(authorizeUpload).not.toHaveBeenCalled()
  })

  it('requires an event to have a published album before contributing', async () => {
    stubPublishedEvents(makeEvent({ albums: [] }))
    const user = userEvent.setup()
    renderApp({ path: '/contribute', auth: authForRole('USER') })

    await user.selectOptions(await screen.findByLabelText('Event'), event.id)

    expect(
      await screen.findByText('No published albums for this event'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Album')).not.toBeInTheDocument()
  })

  it('refuses to upload without an explicit photographer credit', async () => {
    const user = userEvent.setup()
    await chooseEventAndAddFile(user)

    await user.click(
      screen.getByRole('button', {
        name: 'Create submission and upload 1 photograph',
      }),
    )

    expect(
      await screen.findByText('Record who took this photograph.'),
    ).toBeInTheDocument()
    expect(createSubmission).not.toHaveBeenCalled()
    expect(registerPhoto).not.toHaveBeenCalled()
  })

  it('keeps a failed image retryable without losing the submission', async () => {
    const user = userEvent.setup()
    const authorization = makeUploadAuthorization()
    vi.mocked(createSubmission).mockResolvedValue(batch)
    vi.mocked(authorizeUpload).mockResolvedValue(authorization)
    vi.mocked(registerPhoto).mockResolvedValue(makeRegisteredPhoto())
    vi.mocked(uploadImageToCloudinary)
      .mockRejectedValueOnce(new Error('image host unavailable'))
      .mockResolvedValueOnce(authorization.publicId)

    await chooseEventAndAddFile(user)
    await user.type(
      screen.getByLabelText('Photographer credit'),
      'Asha Verma',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Create submission and upload 1 photograph',
      }),
    )

    expect(await screen.findByText('Upload failed')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The photograph could not be uploaded. You can retry it.',
      ),
    ).toBeInTheDocument()
    expect(createSubmission).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Retry upload' }))

    expect(await screen.findByText('Registered for review')).toBeInTheDocument()
    expect(createSubmission).toHaveBeenCalledTimes(1)
    expect(authorizeUpload).toHaveBeenCalledTimes(2)
    expect(registerPhoto).toHaveBeenCalledTimes(1)
  })
})
