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
      className="space-y-5 border-y border-archive-line py-6"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-5">
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

        <div className="lg:col-span-3">
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
        </div>

        <div className="lg:col-span-2">
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

        <div className="lg:col-span-2">
          <SelectField
            id="archive-featured"
            label="Highlight"
            value={values.featured ? 'true' : ''}
            onChange={(event) => {
              onChange({ featured: event.target.value === 'true' })
            }}
          >
            <option value="">All events</option>
            <option value="true">Featured only</option>
          </SelectField>
        </div>
      </div>

      {hasFilters ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </form>
  )
}
