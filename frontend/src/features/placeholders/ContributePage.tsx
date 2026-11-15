import { PlaceholderPage } from './PlaceholderPage'

export default function ContributePage() {
  return (
    <PlaceholderPage
      eyebrow="Contribute"
      title="Share photographs"
      description="Verified members can submit photographs for review, credit photographers, and track each submission."
      deliveryPhase="Phase 08"
      notes={[
        'Signed Cloudinary uploads run directly from the browser; image bytes never pass through the API.',
        'Every submission enters moderation before publication.',
        'Uploader and photographer are recorded as separate concepts.',
      ]}
    />
  )
}
