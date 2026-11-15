import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import { defaultFetchStub } from './fetchStub'

beforeEach(() => {
  // Public pages query the API on mount. Tests that care about specific data
  // replace this stub inside the test body.
  vi.stubGlobal('fetch', vi.fn(defaultFetchStub))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
