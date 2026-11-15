import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Pagination, SelectField, Skeleton, TextField } from '../../components/ui'
import { changeUserRole, changeUserStatus, getAnalytics, listAdminUsers, listAuditLogs } from '../../lib/api/adminGovernanceApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { formatTimestamp } from '../../lib/format'
import { useAuth } from '../auth/useAuth'

export default function AdminOversightPage() {
  const { user: actor } = useAuth()
  const client = useQueryClient()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const users = useQuery({ queryKey: ['admin', 'users', query, page], queryFn: () => listAdminUsers(query, page) })
  const logs = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => listAuditLogs(0, 10) })
  const analytics = useQuery({ queryKey: ['admin', 'analytics'], queryFn: getAnalytics })
  const [notice, setNotice] = useState<string | null>(null)
  const mutation = useMutation({ mutationFn: (input: { id: string; kind: 'status' | 'role'; value: string }) => input.kind === 'status' ? changeUserStatus(input.id, input.value) : changeUserRole(input.id, input.value), onSuccess: (_data, input) => { setNotice(`${input.kind === 'role' ? 'Role' : 'Status'} updated.`); void client.invalidateQueries({ queryKey: ['admin', 'users'] }); void client.invalidateQueries({ queryKey: ['admin', 'audit'] }) } })
  return <div className="space-y-6"><PageHeader eyebrow="Administration" title="People and oversight" description="Manage accounts, inspect administrative activity, and monitor archive operations." />
    {notice ? <Alert tone="success" title="Change recorded">{notice}</Alert> : null}{mutation.isError ? <Alert tone="danger" title="Change not applied">{requestFailureMessage(mutation.error, 'Refresh and try again.')}</Alert> : null}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{analytics.isPending ? <Skeleton className="h-24 w-full" /> : analytics.data ? <><Metric label="Events" value={`${analytics.data.publishedEvents}/${analytics.data.events}`} /><Metric label="Albums" value={`${analytics.data.publishedAlbums}/${analytics.data.albums}`} /><Metric label="Active categories" value={analytics.data.activeCategories} /><Metric label="Contributors" value={analytics.data.contributors} /></> : null}</section>
    <Card className="space-y-4 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-2xl font-semibold">User directory</h2><TextField label="Search users" id="user-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} /></div>{users.isPending ? <Skeleton className="h-48 w-full" /> : users.data?.items.length === 0 ? <EmptyState title="No users found" /> : <ul className="divide-y divide-archive-line">{users.data?.items.map((item) => <li key={item.id} className="space-y-2 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{item.displayName}</p><p className="text-sm text-archive-muted">{item.email} · joined {formatTimestamp(item.createdAt)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge tone="neutral">{item.role}</Badge><Badge tone={item.status === 'ACTIVE' ? 'success' : 'warning'}>{item.status}</Badge>{item.status === 'ACTIVE' ? <Button type="button" size="sm" variant="secondary" onClick={() => mutation.mutate({ id: item.id, kind: 'status', value: 'SUSPENDED' })}>Suspend</Button> : <Button type="button" size="sm" variant="secondary" onClick={() => mutation.mutate({ id: item.id, kind: 'status', value: 'ACTIVE' })}>Activate</Button>}{actor?.role === 'SUPER_ADMIN' && item.id !== actor.id ? <SelectField label="Role" id={`role-${item.id}`} value={item.role} onChange={(e) => mutation.mutate({ id: item.id, kind: 'role', value: e.target.value })}><option value="USER">Member</option><option value="ADMIN">Administrator</option><option value="SUPER_ADMIN">Super administrator</option></SelectField> : null}</div></div></li>)}</ul>}{users.data ? <Pagination page={users.data.page} totalPages={users.data.totalPages} onPageChange={setPage} /> : null}</Card>
    <Card className="space-y-3 p-5"><h2 className="font-serif text-2xl font-semibold">Recent audit activity</h2>{logs.isPending ? <Skeleton className="h-32 w-full" /> : <ul className="space-y-2">{logs.data?.items.map((log) => <li key={log.id} className="rounded border border-archive-line p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{log.action} · {log.entityType}</span><span className="text-archive-muted">{formatTimestamp(log.createdAt)}</span></div><p className="text-archive-muted">{log.actorDisplayName ?? 'System'} · {log.entityId}</p></li>)}</ul>}</Card>
  </div>
}
function Metric({ label, value }: { label: string; value: string | number }) { return <Card className="space-y-1 p-4"><p className="text-xs uppercase tracking-wide text-archive-muted">{label}</p><p className="font-serif text-2xl font-semibold">{value}</p></Card> }
