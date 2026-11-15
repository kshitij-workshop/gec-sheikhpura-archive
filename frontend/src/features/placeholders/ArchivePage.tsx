import { PlaceholderPage } from './PlaceholderPage'

export default function ArchivePage() {
  return (
    <PlaceholderPage
      eyebrow="Explore"
      title="Archive"
      description="Browse institutional events by academic year and category, then open an album to view its photographs."
      deliveryPhase="Phase 07"
      notes={[
        'Published events, albums, categories, and academic years come from the public API.',
        'Filtering, search, and pagination follow the documented page envelope.',
      ]}
    />
  )
}
