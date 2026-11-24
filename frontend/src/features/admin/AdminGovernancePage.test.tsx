import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AppProviders } from '../../app/providers'
import { AuthContext } from '../auth/authContext'
import {
  listRemovalRequests,
  listReports,
  listSuggestions,
} from '../../lib/api/adminGovernanceApi'
import { listAdminEvents } from '../../lib/api/adminApi'
import {
  makeAdminRemovalRequest,
  makeAdminReport,
  makeEvent,
} from '../../test/archiveFixtures'
import { pageOf } from '../../test/fetchStub'
import { authForRole } from '../../test/renderApp'
import AdminGovernancePage from './AdminGovernancePage'

vi.mock('../../lib/api/adminGovernanceApi', () => ({
  listReports: vi.fn(),
  listRemovalRequests: vi.fn(),
  listSuggestions: vi.fn(),
  resolveReport: vi.fn(),
  resolveRemovalRequest: vi.fn(),
  reviewSuggestion: vi.fn(),
}))

vi.mock('../../lib/api/adminApi', () => ({
  listAdminEvents: vi.fn(),
  listAdminAlbums: vi.fn(),
  listModerationQueue: vi.fn(),
  getModerationHistory: vi.fn(),
  getAdminPhoto: vi.fn(),
  moderatePhoto: vi.fn(),
  updatePhoto: vi.fn(),
}))

function renderGovernance(entry = '/admin/governance') {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={authForRole('ADMIN')}>
          <AdminGovernancePage />
        </AuthContext.Provider>
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listReports).mockResolvedValue(pageOf([makeAdminReport()]))
  vi.mocked(listRemovalRequests).mockResolvedValue(
    pageOf([makeAdminRemovalRequest()]),
  )
  vi.mocked(listSuggestions).mockResolvedValue(pageOf())
  vi.mocked(listAdminEvents).mockResolvedValue(pageOf([makeEvent()]))
})

describe('governance queues', () => {
  it('identifies a reported photograph with its image context', async () => {
    renderGovernance()

    expect(
      await screen.findByRole('heading', { name: 'Opening ceremony' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Founders Day · Annual Sports Day'),
    ).toBeInTheDocument()
    expect(screen.getByText('Asha Verma')).toBeInTheDocument()
    expect(
      screen.getByText('A student is identifiable without consent.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Privacy concern').length).toBeGreaterThan(0)

    expect(listReports).toHaveBeenCalledWith({
      status: 'PENDING',
      category: undefined,
      eventId: undefined,
      page: 0,
      size: 10,
    })
  })

  it('sends the category and event filters to the report queue', async () => {
    const user = userEvent.setup()
    renderGovernance()

    await screen.findByRole('heading', { name: 'Opening ceremony' })

    await user.selectOptions(
      screen.getByLabelText('Report category'),
      'PRIVACY',
    )
    await waitFor(() => {
      expect(listReports).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'PRIVACY', page: 0 }),
      )
    })

    const event = makeEvent()
    await user.selectOptions(screen.getByLabelText('Event'), event.id)
    await waitFor(() => {
      expect(listReports).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'PRIVACY', eventId: event.id }),
      )
    })
  })

  it('shows removal requests with the photograph they concern', async () => {
    const user = userEvent.setup()
    renderGovernance()

    await user.click(
      screen.getByRole('button', { name: 'Removal requests' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Opening ceremony' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The subject asked for the photograph to be taken down.',
      ),
    ).toBeInTheDocument()
    expect(listRemovalRequests).toHaveBeenCalledWith({
      status: 'PENDING',
      eventId: undefined,
      page: 0,
      size: 10,
    })
  })
})
