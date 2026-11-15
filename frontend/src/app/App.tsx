import { BrowserRouter } from 'react-router'

import { AuthProvider } from '../features/auth/AuthProvider'
import { AppProviders } from './providers'
import { AppRoutes } from './router'
import { ErrorBoundary } from './ErrorBoundary'
import { ScrollToTop } from './ScrollToTop'

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  )
}
