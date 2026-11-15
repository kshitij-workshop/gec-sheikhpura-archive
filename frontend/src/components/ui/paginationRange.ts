export type PageItem = number | 'gap-left' | 'gap-right'

/**
 * Compact page window: first page, last page, and the current page plus its
 * neighbours, with gaps collapsed into a single marker.
 */
export function buildPageItems(page: number, totalPages: number): PageItem[] {
  const safeTotal = Math.max(1, Math.floor(totalPages))
  const current = Math.min(Math.max(0, Math.floor(page)), safeTotal - 1)

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index)
  }

  const pages = new Set<number>([0, safeTotal - 1, current])
  for (const offset of [-1, 1]) {
    const candidate = current + offset
    if (candidate > 0 && candidate < safeTotal - 1) {
      pages.add(candidate)
    }
  }

  const sorted = [...pages].sort((left, right) => left - right)
  const items: PageItem[] = []
  let previous = -1
  for (const value of sorted) {
    if (previous !== -1 && value - previous > 1) {
      items.push(value - previous === 2 ? previous + 1 : 'gap-right')
    }
    items.push(value)
    previous = value
  }
  return items
}
