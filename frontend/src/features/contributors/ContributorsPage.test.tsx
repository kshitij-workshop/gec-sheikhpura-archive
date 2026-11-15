import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { makeContributor } from '../../test/archiveFixtures'
import { jsonResponse, pageOf, requestPath } from '../../test/fetchStub'
import { renderApp } from '../../test/renderApp'

describe('ContributorsPage', () => {
  it('lists published contributors without account details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const path = requestPath(input)
        if (path.endsWith('/contributors')) {
          return Promise.resolve(
            jsonResponse(
              pageOf([
                makeContributor(),
                makeContributor({
                  id: '99999999-9999-4999-8999-999999999999',
                  displayName: 'Ravi Kumar',
                  slug: 'ravi-kumar',
                  bio: null,
                }),
              ]),
            ),
          )
        }
        return Promise.resolve(jsonResponse([]))
      }),
    )

    renderApp({ path: '/contributors' })

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Asha Verma' }),
    ).toBeInTheDocument()
    expect(screen.getByText('@asha-verma')).toBeInTheDocument()
    expect(
      screen.getByText('Student photographer, class of 2027.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ravi Kumar' }),
    ).toBeInTheDocument()
    expect(screen.getByText('No biography provided.')).toBeInTheDocument()
    expect(screen.getByText('2 published contributors')).toBeInTheDocument()
    expect(screen.queryByText(/@example\./)).not.toBeInTheDocument()
  })
})
