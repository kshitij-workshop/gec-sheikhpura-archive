import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function stubPublicApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/auth/csrf')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ token: 'e2e-csrf-token', headerName: 'X-XSRF-TOKEN' }),
      })
      return
    }

    if (url.pathname.endsWith('/auth/refresh')) {
      await route.fulfill({ status: 401, body: '' })
      return
    }

    if (url.pathname.endsWith('/events')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          page: 0,
          size: 12,
          totalElements: 0,
          totalPages: 0,
        }),
      })
      return
    }

    if (
      url.pathname.endsWith('/academic-years') ||
      url.pathname.endsWith('/categories') ||
      url.pathname.endsWith('/contributors')
    ) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        page: 0,
        size: 12,
        totalElements: 0,
        totalPages: 0,
      }),
    })
  })
}

test.describe('public browser smoke tests', () => {
  test('renders the archive identity and public navigation', async ({ page }) => {
    await stubPublicApi(page)
    await page.goto('/')

    await expect(
      page.getByRole('link', { name: /GEC Sheikhpura Archive/i }),
    ).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', {
        name: 'Archive',
        exact: true,
      }),
    ).toBeVisible()
  })

  test('shows an honest empty archive state', async ({ page }) => {
    await stubPublicApi(page)
    await page.goto('/archive')

    await expect(
      page.getByRole('heading', { name: 'The archive', exact: true }),
    ).toBeVisible()
    await expect(page.getByText(/archive is just getting started/i)).toBeVisible()
  })

  test('redirects an anonymous visitor away from administration', async ({ page }) => {
    await stubPublicApi(page)
    await page.goto('/admin')

    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('keeps the public photo viewer keyboard accessible', async ({ page }) => {
    await stubPublicApi(page)
    await page.goto('/about')

    await expect(
      page.getByRole('heading', { name: 'Preserving college memory, carefully' }),
    ).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
  })
})
