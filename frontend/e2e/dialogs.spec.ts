import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Native `<dialog>` centring.
 *
 * Tailwind's preflight resets `margin` on every element, which removes the
 * user-agent `margin: auto` that centres a modal dialog. The regression is
 * invisible to jsdom, so it is asserted here in a real browser: the open
 * dialog's centre must sit on the viewport centre.
 */
const album = {
  id: 'a1000000-0000-4000-8000-000000000001',
  title: '2k24 Batch',
  slug: '2k24-batch',
  description: null,
  event: {
    id: 'e1000000-0000-4000-8000-000000000001',
    title: 'Farewell 2024',
    slug: 'farewell-2024',
    description: null,
    eventDate: '2024-02-10',
    location: null,
    published: true,
    featured: false,
    academicYear: {
      id: 'y1000000-0000-4000-8000-000000000001',
      label: '2023–24',
      startDate: '2023-07-01',
      endDate: '2024-06-30',
    },
    category: {
      id: 'c1000000-0000-4000-8000-000000000001',
      name: 'Farewell',
      slug: 'farewell',
      description: null,
      sortOrder: 1,
      active: true,
    },
    albums: [],
  },
  photos: {
    items: [
      {
        id: 'p1000000-0000-4000-8000-000000000001',
        title: '1st Pic',
        caption: null,
        altText: null,
        cloudinaryPublicId: 'demo/first-picture',
        format: 'jpg',
        widthPx: 1200,
        heightPx: 800,
        takenAt: null,
        sortOrder: 0,
        photographers: [{ creditName: 'Kshitij', creditOrder: 0 }],
      },
    ],
    page: 0,
    size: 24,
    totalElements: 1,
    totalPages: 1,
  },
}

const emptyPage = {
  items: [],
  page: 0,
  size: 24,
  totalElements: 0,
  totalPages: 0,
}

async function stubAlbumApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())

    if (pathname.endsWith('/auth/csrf')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ token: 'e2e-csrf-token', headerName: 'X-XSRF-TOKEN' }),
      })
      return
    }

    if (pathname.endsWith('/auth/refresh')) {
      await route.fulfill({ status: 401, body: '' })
      return
    }

    if (pathname.endsWith('/albums/slug/2k24-batch')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(album),
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(emptyPage),
    })
  })
}

test('centres the photo viewer dialog on the viewport', async ({ page }) => {
  await stubAlbumApi(page)
  await page.goto('/albums/2k24-batch')

  await page.getByRole('button', { name: 'View 1st Pic' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  const offsets = await dialog.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      dx: Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
      dy: Math.abs(box.top + box.height / 2 - window.innerHeight / 2),
      // `auto` margins resolve to pixels; equal sides prove the rule applied.
      symmetricX: style.marginLeft === style.marginRight,
      symmetricY: style.marginTop === style.marginBottom,
    }
  })

  expect(offsets.dx).toBeLessThanOrEqual(2)
  expect(offsets.dy).toBeLessThanOrEqual(2)
  expect(offsets.symmetricX).toBe(true)
  expect(offsets.symmetricY).toBe(true)
})
