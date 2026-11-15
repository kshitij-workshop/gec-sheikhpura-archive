import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, PageHeader, SelectField, Skeleton, TextField, TextAreaField } from '../../components/ui'
import { createAdminAlbum, createAdminCategory, createAdminEvent, createAdminYear, listAdminCategories, listAdminEvents, listAdminYears, updateAdminEvent } from '../../lib/api/adminApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'

export default function AdminArchiveManagementPage() {
  const client = useQueryClient()
  const years = useQuery({ queryKey: ['admin', 'years'], queryFn: listAdminYears })
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: listAdminCategories })
  const events = useQuery({ queryKey: ['admin', 'events'], queryFn: () => listAdminEvents(0, 50) })
  const [year, setYear] = useState({ label: '', startDate: '', endDate: '' })
  const [category, setCategory] = useState({ name: '', slug: '', description: '' })
  const [event, setEvent] = useState({ title: '', eventDate: '', academicYearId: '', categoryId: '', location: '' })
  const [album, setAlbum] = useState({ eventId: '', title: '' })
  const [notice, setNotice] = useState<string | null>(null)
  const save = useMutation({ mutationFn: async (input: { type: string; body: unknown }) => { if (input.type === 'year') return createAdminYear(input.body); if (input.type === 'category') return createAdminCategory(input.body); if (input.type === 'album') return createAdminAlbum(input.body); return createAdminEvent(input.body) }, onSuccess: (_data, input) => { setNotice(`${input.type[0]!.toUpperCase()}${input.type.slice(1)} created.`); void client.invalidateQueries({ queryKey: ['admin'] }) } })
  const togglePublish = useMutation({
    mutationFn: (input: { id: string; published: boolean }) => {
      const current = events.data?.items.find((item) => item.id === input.id)
      if (!current) {
        throw new Error('The event is no longer available. Refresh and try again.')
      }

      // EventResponse is a read model with nested academicYear/category
      // objects. EventRequest is a write model and requires their IDs.
      return updateAdminEvent(input.id, {
        academicYearId: current.academicYear.id,
        categoryId: current.category.id,
        title: current.title,
        slug: current.slug,
        description: current.description,
        eventDate: current.eventDate,
        location: current.location,
        published: input.published,
        featured: current.featured,
      })
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'events'] })
    },
  })
  return <div className="space-y-6"><PageHeader eyebrow="Administration" title="Archive management" description="Maintain academic years, categories, events, and albums." />
    {notice ? <Alert tone="success" title="Archive updated">{notice}</Alert> : null}{save.isError ? <Alert tone="danger" title="Could not save">{requestFailureMessage(save.error, 'Check the fields and try again.')}</Alert> : null}
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="space-y-3 p-5"><h2 className="font-serif text-xl font-semibold">Academic years</h2><TextField label="Label" id="year-label" value={year.label} onChange={(e) => setYear({ ...year, label: e.target.value })} /><TextField label="Start date" id="year-start" type="date" value={year.startDate} onChange={(e) => setYear({ ...year, startDate: e.target.value })} /><TextField label="End date" id="year-end" type="date" value={year.endDate} onChange={(e) => setYear({ ...year, endDate: e.target.value })} /><Button type="button" isLoading={save.isPending} onClick={() => save.mutate({ type: 'year', body: year })}>Add year</Button><ul className="space-y-1 text-sm text-archive-muted">{years.data?.map((item) => <li key={item.id}>{item.label}</li>)}</ul></Card>
      <Card className="space-y-3 p-5"><h2 className="font-serif text-xl font-semibold">Categories</h2><TextField label="Name" id="category-name" value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })} /><TextField label="Slug" id="category-slug" optional value={category.slug} onChange={(e) => setCategory({ ...category, slug: e.target.value })} /><TextAreaField label="Description" id="category-description" optional value={category.description} onChange={(e) => setCategory({ ...category, description: e.target.value })} /><Button type="button" isLoading={save.isPending} onClick={() => save.mutate({ type: 'category', body: { ...category, sortOrder: 0, active: true } })}>Add category</Button><ul className="space-y-1 text-sm text-archive-muted">{categories.data?.map((item) => <li key={item.id}>{item.name} {item.active ? '' : '(inactive)'}</li>)}</ul></Card>
      <Card className="space-y-3 p-5"><h2 className="font-serif text-xl font-semibold">Events</h2><TextField label="Title" id="event-title" value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} /><SelectField label="Academic year" id="event-year" value={event.academicYearId} onChange={(e) => setEvent({ ...event, academicYearId: e.target.value })}><option value="">Choose a year</option>{years.data?.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectField><SelectField label="Category" id="event-category" value={event.categoryId} onChange={(e) => setEvent({ ...event, categoryId: e.target.value })}><option value="">Choose a category</option>{categories.data?.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField><TextField label="Event date" id="event-date" type="date" value={event.eventDate} onChange={(e) => setEvent({ ...event, eventDate: e.target.value })} /><TextField label="Location" id="event-location" optional value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} /><Button type="button" isLoading={save.isPending} onClick={() => save.mutate({ type: 'event', body: { ...event, published: false, featured: false } })}>Add draft event</Button></Card>
    </div>
    <Card className="space-y-3 p-5"><h2 className="font-serif text-xl font-semibold">Albums</h2><div className="grid gap-3 md:grid-cols-3"><SelectField label="Event" id="album-event" value={album.eventId} onChange={(e) => setAlbum({ ...album, eventId: e.target.value })}><option value="">Choose an event</option>{events.data?.items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</SelectField><TextField label="Title" id="album-title" value={album.title} onChange={(e) => setAlbum({ ...album, title: e.target.value })} /><div className="flex items-end"><Button type="button" isLoading={save.isPending} onClick={() => save.mutate({ type: 'album', body: { ...album, published: false, sortOrder: 0 } })}>Add draft album</Button></div></div></Card>
    <Card className="space-y-3 p-5"><h2 className="font-serif text-xl font-semibold">Events and publication</h2>{events.isPending ? <Skeleton className="h-28 w-full" /> : <ul className="divide-y divide-archive-line">{events.data?.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.title}</p><p className="text-sm text-archive-muted">{item.eventDate} · {item.published ? 'Published' : 'Draft'} · {item.albums.length} albums</p></div><Button type="button" size="sm" variant={item.published ? 'secondary' : 'primary'} isLoading={togglePublish.isPending} onClick={() => togglePublish.mutate({ id: item.id, published: !item.published })}>{item.published ? 'Unpublish' : 'Publish'}</Button></li>)}</ul>}</Card>
  </div>
}
