import { PlaceholderPage } from './PlaceholderPage'

export default function AdminPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Admin dashboard"
      description="Moderate submissions, manage the archive structure, and review governance activity."
      deliveryPhase="Phase 09"
      notes={[
        'Moderation queue with audit history for every transition.',
        'Events, albums, categories, contributors, and user management.',
        'Reports, removal requests, event suggestions, analytics, and audit logs.',
      ]}
    />
  )
}
