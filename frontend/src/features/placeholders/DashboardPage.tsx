import { PlaceholderPage } from './PlaceholderPage'

export default function DashboardPage() {
  return (
    <PlaceholderPage
      eyebrow="Member area"
      title="Your dashboard"
      description="Track submissions, manage suggestions, and review your profile."
      deliveryPhase="Phase 08"
      notes={[
        'My uploads with moderation status and photographer credits.',
        'New submission, removal requests, and event suggestions.',
        'Profile and password management.',
      ]}
    />
  )
}
