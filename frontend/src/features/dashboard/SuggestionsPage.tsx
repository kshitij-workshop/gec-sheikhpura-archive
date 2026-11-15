import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  SelectField,
  Skeleton,
  TextAreaField,
  TextField,
} from '../../components/ui'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { createSuggestion } from '../../lib/api/contributionApi'
import type { CreateSuggestionInput } from '../../lib/api/contributionApi'
import { formatEventDate, formatTimestamp } from '../../lib/format'
import { useAcademicYears, useCategories } from '../archive/queries'
import { StatusBadge } from '../../components/domain/StatusBadge'
import { useMySuggestions } from './queries'

const PAGE_SIZE = 10

interface SuggestionForm {
  title: string
  description: string
  approximateDate: string
  categoryId: string
  academicYearId: string
}

const emptyForm: SuggestionForm = {
  title: '',
  description: '',
  approximateDate: '',
  categoryId: '',
  academicYearId: '',
}

interface FormErrors {
  title?: string
  description?: string
}

export default function SuggestionsPage() {
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SuggestionForm>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const suggestions = useMySuggestions(page, PAGE_SIZE)
  const categories = useCategories()
  const years = useAcademicYears()

  const create = useMutation({
    mutationFn: (input: CreateSuggestionInput) => createSuggestion(input),
    onSuccess: (suggestion) => {
      setForm(emptyForm)
      setErrors({})
      setFormOpen(false)
      setNotice(`“${suggestion.title}” was sent for review.`)
      void queryClient.invalidateQueries({
        queryKey: ['me', 'event-suggestions'],
      })
    },
  })

  const update = (patch: Partial<SuggestionForm>) => {
    setForm((current) => ({ ...current, ...patch }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = form.title.trim()
    const next: FormErrors = {}

    if (title.length === 0) {
      next.title = 'Give the suggested event a title.'
    } else if (title.length > 160) {
      next.title = 'Use 160 characters or fewer.'
    }
    if (form.description.trim().length > 10000) {
      next.description = 'Use 10,000 characters or fewer.'
    }

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setErrors({})
    create.mutate({
      title,
      description: form.description.trim() || null,
      approximateDate: form.approximateDate || null,
      categoryId: form.categoryId || null,
      academicYearId: form.academicYearId || null,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Member area"
        title="Event suggestions"
        description="Know of a college event missing from the archive? Suggest it for an administrator to review."
        actions={
          <Button
            type="button"
            onClick={() => {
              setFormOpen((current) => !current)
            }}
            aria-expanded={formOpen}
            aria-controls="suggestion-form"
          >
            {formOpen ? 'Close form' : 'Suggest an event'}
          </Button>
        }
      />

      {notice ? (
        <Alert tone="success" title="Suggestion received">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{notice}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setNotice(null)
              }}
            >
              Dismiss
            </Button>
          </div>
        </Alert>
      ) : null}

      {formOpen ? (
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2
              id="suggestion-form"
              className="font-serif text-xl font-semibold tracking-tight"
            >
              Suggest an event
            </h2>
            <p className="text-sm text-archive-muted">
              All suggestions are reviewed before an event is created. Category
              and academic year are optional context for the reviewer.
            </p>
          </div>

          {create.isError ? (
            <Alert tone="danger" title="Suggestion not sent">
              {requestFailureMessage(
                create.error,
                'The suggestion could not be sent. Please try again.',
              )}
            </Alert>
          ) : null}

          <form
            noValidate
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <TextField
              id="suggestion-title"
              label="Event title"
              value={form.title}
              error={errors.title}
              maxLength={160}
              onChange={(event) => {
                update({ title: event.target.value })
              }}
            />

            <TextAreaField
              id="suggestion-description"
              label="What happened?"
              optional
              hint="A short description helps a moderator identify the event."
              value={form.description}
              error={errors.description}
              maxLength={10000}
              onChange={(event) => {
                update({ description: event.target.value })
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="suggestion-date"
                type="date"
                label="Approximate date"
                optional
                value={form.approximateDate}
                onChange={(event) => {
                  update({ approximateDate: event.target.value })
                }}
              />

              <SelectField
                id="suggestion-category"
                label="Category"
                optional
                value={form.categoryId}
                onChange={(event) => {
                  update({ categoryId: event.target.value })
                }}
              >
                <option value="">Not specified</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <SelectField
              id="suggestion-year"
              label="Academic year"
              optional
              hint="Only needed if you know which session the event belongs to."
              value={form.academicYearId}
              onChange={(event) => {
                update({ academicYearId: event.target.value })
              }}
            >
              <option value="">Not specified</option>
              {(years.data ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </SelectField>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={create.isPending}>
                Send suggestion
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFormOpen(false)
                  setErrors({})
                }}
                disabled={create.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {suggestions.isError ? (
        <Alert tone="danger" title="Suggestions could not be loaded">
          Refresh the page to try again.
        </Alert>
      ) : null}

      {suggestions.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {suggestions.data && suggestions.data.items.length === 0 ? (
        <EmptyState
          title="No suggestions yet"
          description="Suggestions you send appear here with the reviewer's decision."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormOpen(true)
              }}
            >
              Suggest the first event
            </Button>
          }
        />
      ) : null}

      {suggestions.data && suggestions.data.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {suggestions.data.items.map((suggestion) => (
              <li key={suggestion.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="font-serif text-xl font-semibold tracking-tight">
                        {suggestion.title}
                      </h2>
                      <p className="text-sm text-archive-muted">
                        {[
                          suggestion.categoryName,
                          suggestion.academicYearLabel,
                          suggestion.approximateDate
                            ? formatEventDate(suggestion.approximateDate)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'No context provided'}
                      </p>
                    </div>
                    <StatusBadge status={suggestion.status} />
                  </div>

                  {suggestion.description ? (
                    <p className="text-sm leading-relaxed text-archive-ink">
                      {suggestion.description}
                    </p>
                  ) : null}

                  {suggestion.reviewNote ? (
                    <Alert
                      tone={
                        suggestion.status === 'REJECTED' ? 'warning' : 'info'
                      }
                      title="Reviewer note"
                    >
                      {suggestion.reviewNote}
                    </Alert>
                  ) : null}

                  <p className="text-xs text-archive-muted">
                    Sent {formatTimestamp(suggestion.createdAt)}
                    {suggestion.reviewedAt
                      ? ` · reviewed ${formatTimestamp(suggestion.reviewedAt)}`
                      : ''}
                  </p>
                </Card>
              </li>
            ))}
          </ul>

          <Pagination
            page={suggestions.data.page}
            totalPages={suggestions.data.totalPages}
            onPageChange={setPage}
            disabled={suggestions.isFetching}
          />
        </>
      ) : null}
    </div>
  )
}
