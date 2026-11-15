import { PlaceholderPage } from './PlaceholderPage'

export default function AboutPage() {
  return (
    <PlaceholderPage
      eyebrow="About"
      title="About the archive"
      description="Why this archive exists, how moderation works, and how privacy and attribution are protected."
      deliveryPhase="Phase 07"
      notes={[
        'Editorial guidelines, privacy policy, and takedown contact.',
        'A short history of the archive and the people behind it.',
      ]}
    />
  )
}
