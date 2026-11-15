import type {
  AcademicYear,
  AlbumDetail,
  AlbumSummary,
  ArchiveEvent,
  Category,
  PublicContributor,
  PublicPhoto,
} from '../lib/api/types'
import { pageOf } from './fetchStub'

export function makeYear(overrides: Partial<AcademicYear> = {}): AcademicYear {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    label: '2025-2026',
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    ...overrides,
  }
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Sports',
    slug: 'sports',
    description: 'Athletic events',
    sortOrder: 0,
    active: true,
    ...overrides,
  }
}

export function makeAlbumSummary(overrides: Partial<AlbumSummary> = {}): AlbumSummary {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Annual Sports Day',
    slug: 'annual-sports-day',
    description: 'Track and field highlights.',
    sortOrder: 0,
    ...overrides,
  }
}

export function makeEvent(overrides: Partial<ArchiveEvent> = {}): ArchiveEvent {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Founders Day',
    slug: 'founders-day',
    description: 'A celebration of the college founding.',
    eventDate: '2026-02-14',
    location: 'Main Campus',
    published: true,
    featured: true,
    academicYear: makeYear(),
    category: makeCategory(),
    albums: [makeAlbumSummary()],
    ...overrides,
  }
}

export function makePhoto(overrides: Partial<PublicPhoto> = {}): PublicPhoto {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    title: 'Opening ceremony',
    caption: 'The ceremony begins on the main lawn.',
    altText: 'Students gathered on the main lawn during the opening ceremony',
    cloudinaryPublicId: 'gecs/opening-ceremony',
    format: 'jpg',
    widthPx: 1600,
    heightPx: 1067,
    takenAt: '2026-02-14T09:30:00Z',
    sortOrder: 0,
    photographers: [{ creditName: 'Asha Verma', creditOrder: 0 }],
    ...overrides,
  }
}

export function makeAlbum(overrides: Partial<AlbumDetail> = {}): AlbumDetail {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Annual Sports Day',
    slug: 'annual-sports-day',
    description: 'Track and field highlights.',
    event: makeEvent(),
    photos: pageOf([makePhoto()]),
    ...overrides,
  }
}

export function makeContributor(
  overrides: Partial<PublicContributor> = {},
): PublicContributor {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    displayName: 'Asha Verma',
    slug: 'asha-verma',
    bio: 'Student photographer, class of 2027.',
    ...overrides,
  }
}
