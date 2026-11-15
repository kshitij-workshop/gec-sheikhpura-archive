import { PlaceholderPage } from './PlaceholderPage'

export default function ContributorsPage() {
  return (
    <PlaceholderPage
      eyebrow="People"
      title="Contributors"
      description="Meet the photographers and collectors who keep the college's visual memory alive."
      deliveryPhase="Phase 07"
      notes={[
        'Published contributor profiles are read from the public API.',
        'Attribution always reflects the photographer, never the uploader.',
      ]}
    />
  )
}
