import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppProviders } from './providers'
import { AppRoutes } from './router'

function renderRoute(path: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('application shell', () => {
  it('renders the archive identity and navigation', () => {
    renderRoute('/')

    expect(
      screen.getByRole('link', { name: /GEC Sheikhpura Archive/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('renders the home page content', () => {
    renderRoute('/')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /photograph archive, built by its community/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /foundation in progress/i }),
    ).toBeInTheDocument()
  })

  it('renders a not-found page for unknown routes', () => {
    renderRoute('/missing-page')

    expect(
      screen.getByRole('heading', { name: /not in the archive/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return home/i })).toBeInTheDocument()
  })
})
