import { BrowserRouter } from 'react-router'

import { AppProviders } from './providers'
import { AppRoutes } from './router'
import { ErrorBoundary } from './ErrorBoundary'

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  )
}
