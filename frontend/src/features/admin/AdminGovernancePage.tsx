import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { Alert, Button, Card, Dialog, EmptyState, PageHeader, Pagination, SelectField, Skeleton, TextAreaField } from '../../components/ui'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { formatTimestamp } from '../../lib/format'
import { listRemovalRequests, listReports, listSuggestions, resolveRemovalRequest, resolveReport, reviewSuggestion } from '../../lib/api/adminGovernanceApi'
import type { AdminEventSuggestion, AdminRemovalRequest, AdminReport } from '../../lib/api/types'

type Section = 'reports' | 'removals' | 'suggestions'
const sections: Array<{ value: Section; label: string }> = [
  { value: 'reports', label: 'Reports' },
  { value: 'removals', label: 'Removal requests' },
  { value: 'suggestions', label: 'Event suggestions' },
]

export default function AdminGovernancePage() {
  const [params, setParams] = useSearchParams()
  const section = (sections.some((item) => item.value === params.get('section')) ? params.get('section') : 'reports') as Section
  const status = params.get('status') ?? 'PENDING'
  const page = Math.max(0, Number(params.get('page') ?? 0))
  const [target, setTarget] = useState<{ item: AdminReport | AdminRemovalRequest | AdminEventSuggestion; kind: Section } | null>(null)
  const [note, setNote] = useState('')
  const [decision, setDecision] = useState('')
  const [createEvent, setCreateEvent] = useState(false)
  const queryClient = useQueryClient()
  const reports = useQuery({ queryKey: ['admin', 'reports', status, page], queryFn: () => listReports(status, page) , enabled: section === 'reports' })
  const removals = useQuery({ queryKey: ['admin', 'removals', status, page], queryFn: () => listRemovalRequests(status, page), enabled: section === 'removals' })
  const suggestions = useQuery({ queryKey: ['admin', 'suggestions', status, page], queryFn: () => listSuggestions(status, page), enabled: section === 'suggestions' })
  const active = section === 'reports' ? reports : section === 'removals' ? removals : suggestions
  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error('No item selected')
      if (!note.trim()) throw new Error('A resolution note is required.')
      if (!decision) throw new Error('Choose a decision.')
      if (target.kind === 'reports') return resolveReport(target.item.id, { status: decision, resolutionNote: note.trim() })
      if (target.kind === 'removals') return resolveRemovalRequest(target.item.id, { status: decision, resolutionNote: note.trim() })
      return reviewSuggestion(target.item.id, { status: decision, reviewNote: note.trim(), createEvent })
    },
    onSuccess: () => { setTarget(null); setNote(''); setDecision(''); setCreateEvent(false); void queryClient.invalidateQueries({ queryKey: ['admin'] }) },
  })
  const setSection = (next: Section) => { const p = new URLSearchParams(params); p.set('section', next); p.set('page', '0'); p.set('status', 'PENDING'); setParams(p) }
  const items = active.data?.items ?? []
  return <div className="space-y-6">
    <PageHeader eyebrow="Administration" title="Governance queues" description="Review reports, removal requests, and community event suggestions." />
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Governance queues">
      {sections.map((item) => <Button key={item.value} type="button" size="sm" variant={section === item.value ? 'primary' : 'secondary'} onClick={() => setSection(item.value)}>{item.label}</Button>)}
    </div>
    <div className="max-w-xs"><SelectField label="Status" id="governance-status" value={status} onChange={(e) => { const p = new URLSearchParams(params); p.set('status', e.target.value); p.set('page', '0'); setParams(p) }}>
      <option value="PENDING">Pending</option><option value="UNDER_REVIEW">Under review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option>
    </SelectField></div>
    {active.isError ? <Alert tone="danger" title="Queue could not be loaded">{requestFailureMessage(active.error, 'Refresh and try again.')}</Alert> : null}
    {active.isPending ? <Skeleton className="h-48 w-full" /> : null}
    {!active.isPending && items.length === 0 ? <EmptyState title="Nothing needs attention" description="There are no records in this queue and status." /> : null}
    {items.length > 0 ? <><ul className="space-y-3">{items.map((item) => <li key={item.id}><Card className="space-y-3 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-serif text-xl font-semibold">{section === 'suggestions' ? (item as AdminEventSuggestion).title : section === 'reports' ? `Report on photo ${(item as AdminReport).photoId.slice(0, 8)}` : `Removal request for photo ${(item as AdminRemovalRequest).photoId.slice(0, 8)}`}</h2><p className="text-sm text-archive-muted">{formatTimestamp(item.createdAt)}</p></div><span className="text-sm font-semibold">{item.status}</span></div><p className="text-sm text-archive-muted">{section === 'suggestions' ? (item as AdminEventSuggestion).description || 'No description provided.' : section === 'reports' ? `${(item as AdminReport).category}: ${(item as AdminReport).details}` : (item as AdminRemovalRequest).reason}</p><Button type="button" size="sm" onClick={() => { setTarget({ item, kind: section }); setNote(''); setDecision(section === 'reports' ? 'RESOLVED' : section === 'removals' ? 'APPROVED' : 'APPROVED') }}>Review</Button></Card></li>)}</ul><Pagination page={active.data!.page} totalPages={active.data!.totalPages} onPageChange={(next) => { const p = new URLSearchParams(params); p.set('page', String(next)); setParams(p) }} /></> : null}
    {target ? <Dialog open onClose={() => setTarget(null)} title="Review governance item" description="This decision is recorded in the audit log." footer={<><Button type="button" variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button type="button" isLoading={mutation.isPending} onClick={() => mutation.mutate()}>Record decision</Button></>}><div className="space-y-3">{mutation.isError ? <Alert tone="danger" title="Decision not recorded">{requestFailureMessage(mutation.error, 'Check the note and try again.')}</Alert> : null}<SelectField label="Decision" id="governance-decision" value={decision} onChange={(e) => setDecision(e.target.value)}>{target.kind === 'reports' ? <><option value="UNDER_REVIEW">Keep under review</option><option value="RESOLVED">Resolve</option><option value="DISMISSED">Dismiss</option></> : target.kind === 'removals' ? <><option value="APPROVED">Approve removal</option><option value="REJECTED">Reject removal</option></> : <><option value="APPROVED">Approve suggestion</option><option value="REJECTED">Reject suggestion</option></>}</SelectField>{target.kind === 'suggestions' && decision === 'APPROVED' ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={createEvent} onChange={(e) => setCreateEvent(e.target.checked)} /> Create a draft event</label> : null}<TextAreaField id="governance-note" label="Resolution note" required value={note} maxLength={1000} error={mutation.error instanceof Error && (mutation.error.message.includes('required') || mutation.error.message.includes('Choose')) ? mutation.error.message : undefined} onChange={(e) => setNote(e.target.value)} /></div></Dialog> : null}
  </div>
}
