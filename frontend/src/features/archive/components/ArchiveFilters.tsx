import type { FormEvent } from 'react'

import {
  Button,
  SelectField,
  TextField,
  buttonStyles,
} from '../../../components/ui'
import type { AcademicYear, Category } from '../../../lib/api/types'

export interface ArchiveFilterValues {
  query: string
  academicYearId: string
  categoryId: string
  featured: boolean
}

export interface ArchiveFiltersProps {
  years: AcademicYear[]
  categories: Category[]
  values: ArchiveFilterValues
  onChange: (patch: Partial<ArchiveFilterValues>) => void
  onReset: () => void
}

/**
 * Archive narrowing form. Values live in the URL, so a filtered view is
 * shareable and survives a reload; selects apply immediately while the title
 * search submits explicitly.
 */
export function ArchiveFilters({
  years,
  categories,
  values,
  onChange,
  onReset,
}: ArchiveFiltersProps) {
  const hasFilters =
    values.query.length > 0 ||
    values.academicYearId.length > 0 ||
    values.categoryId.length > 0 ||
    values.featured

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onChange({ query: String(data.get('q') ?? '').trim() })
  }

  return (
    <form
      aria-label="Filter the archive"
      onSubmit={submitSearch}
      className="space-y-4 rounded-xl border border-archive-line bg-archive-surface p-5"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-2">
          <div className="flex-1">
            <TextField
              key={values.query}
              id="archive-search"
              name="q"
              type="search"
              label="Search events"
              placeholder="Title contains…"
              defaultValue={values.query}
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>

        <SelectField
          id="archive-year"
          label="Academic year"
          value={values.academicYearId}
          onChange={(event) => {
            onChange({ academicYearId: event.target.value })
          }}
        >
          <option value="">All years</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="archive-category"
          label="Category"
          value={values.categoryId}
          onChange={(event) => {
            onChange({ categoryId: event.target.value })
          }}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <SelectField
          id="archive-featured"
          label="Highlight"
          className="max-w-56"
          value={values.featured ? 'true' : ''}
          onChange={(event) => {
            onChange({ featured: event.target.value === 'true' })
          }}
        >
          <option value="">All events</option>
          <option value="true">Featured only</option>
        </SelectField>

        {hasFilters ? (
          <button type="button" onClick={onReset} className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
            Clear filters
          </button>
        ) : null}
      </div>
    </form>
  )
}
