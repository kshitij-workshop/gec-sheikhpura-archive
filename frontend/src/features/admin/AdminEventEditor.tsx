import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  Alert,
  Button,
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui'
import { updateAdminEvent } from '../../lib/api/adminApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import type { AcademicYear, ArchiveEvent, Category } from '../../lib/api/types'

interface AdminEventEditorProps {
  event: ArchiveEvent
  years: AcademicYear[]
  categories: Category[]
  onClose: () => void
}

/**
 * Inline editor for an existing event. The public slug is preserved so already
 * shared archive links keep working; only the human-readable details change.
 */
export function AdminEventEditor({
  event,
  years,
  categories,
  onClose,
}: AdminEventEditorProps) {
  const client = useQueryClient()
  const [title, setTitle] = useState(event.title)
  const [eventDate, setEventDate] = useState(event.eventDate)
  const [location, setLocation] = useState(event.location ?? '')
  const [description, setDescription] = useState(event.description ?? '')
  const [academicYearId, setAcademicYearId] = useState(event.academicYear.id)
  const [categoryId, setCategoryId] = useState(event.category.id)

  const save = useMutation({
    mutationFn: () =>
      updateAdminEvent(event.id, {
        academicYearId,
        categoryId,
        title,
        description: description.trim() === '' ? null : description,
        eventDate,
        location: location.trim() === '' ? null : location,
        published: event.published,
        featured: event.featured,
      }),
    onSuccess: () => {
      void client.invalidateQueries()
      onClose()
    },
  })

  return (
    <form
      className="mt-3 space-y-3 border-t border-archive-line pt-3"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault()
        save.mutate()
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          label="Event title"
          id={`event-title-${event.id}`}
          value={title}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          required
        />
        <TextField
          label="Event date"
          id={`event-date-${event.id}`}
          type="date"
          value={eventDate}
          onChange={(changeEvent) => setEventDate(changeEvent.target.value)}
          required
        />
        <SelectField
          label="Academic year"
          id={`event-year-${event.id}`}
          value={academicYearId}
          onChange={(changeEvent) =>
            setAcademicYearId(changeEvent.target.value)
          }
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Category"
          id={`event-category-${event.id}`}
          value={categoryId}
          onChange={(changeEvent) => setCategoryId(changeEvent.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Location"
          id={`event-location-${event.id}`}
          optional
          value={location}
          onChange={(changeEvent) => setLocation(changeEvent.target.value)}
        />
      </div>
      <TextAreaField
        label="Description"
        id={`event-description-${event.id}`}
        optional
        value={description}
        onChange={(changeEvent) => setDescription(changeEvent.target.value)}
      />
      {save.isError ? (
        <Alert tone="danger" title="Could not update the event">
          {requestFailureMessage(save.error, 'Check the fields and try again.')}
        </Alert>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={save.isPending}>
          Save event
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClose}
          disabled={save.isPending}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-archive-muted">
        Public link: /archive/events/{event.slug}
      </p>
    </form>
  )
}
