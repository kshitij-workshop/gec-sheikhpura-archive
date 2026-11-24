import type {
  AcademicYear,
  AdminAlbum,
  AdminPhotoSummary,
  AdminRemovalRequest,
  AdminReport,
  AlbumDetail,
  AlbumSummary,
  ArchiveEvent,
  Category,
  EventSuggestion,
  ModerationHistoryEntry,
  ModerationPhoto,
  PublicContributor,
  PublicPhoto,
  RecentPhoto,
  RegisteredPhoto,
  RemovalRequest,
  Submission,
  UploadAuthorization,
  UserPhoto,
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
    viewerCanRequestRemoval: false,
    ...overrides,
  }
}

export function makeRecentPhoto(
  overrides: Partial<RecentPhoto> = {},
): RecentPhoto {
  return {
    ...makePhoto(),
    approvedAt: '2026-02-16T09:00:00Z',
    albumId: makeAlbumSummary().id,
    albumTitle: makeAlbumSummary().title,
    albumSlug: makeAlbumSummary().slug,
    eventId: makeEvent().id,
    eventTitle: makeEvent().title,
    eventSlug: makeEvent().slug,
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

export function makeSubmission(
  overrides: Partial<Submission> = {},
): Submission {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    eventId: makeEvent().id,
    eventTitle: makeEvent().title,
    albumId: makeAlbumSummary().id,
    albumTitle: makeAlbumSummary().title,
    status: 'PENDING',
    note: 'Photographs from the main lawn.',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
    ...overrides,
  }
}

export function makeUserPhoto(overrides: Partial<UserPhoto> = {}): UserPhoto {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    submissionId: makeSubmission().id,
    eventId: makeEvent().id,
    eventTitle: makeEvent().title,
    albumId: makeAlbumSummary().id,
    albumTitle: makeAlbumSummary().title,
    title: 'Opening ceremony',
    caption: null,
    altText: null,
    format: 'jpg',
    widthPx: 1600,
    heightPx: 1067,
    sizeBytes: 2_400_000,
    takenAt: '2026-02-14T09:30:00Z',
    status: 'PENDING',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
    photographers: [{ contributorProfileId: null, creditName: 'Asha Verma', creditOrder: 0 }],
    ...overrides,
  }
}

export function makeSuggestion(
  overrides: Partial<EventSuggestion> = {},
): EventSuggestion {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    title: 'Founders Day',
    description: 'A celebration of the college founding.',
    approximateDate: '2026-02-14',
    categoryId: makeCategory().id,
    categoryName: makeCategory().name,
    academicYearId: makeYear().id,
    academicYearLabel: makeYear().label,
    suggestedByUserId: '3f1c2b4a-0000-4000-8000-000000000001',
    reviewedByUserId: null,
    createdEventId: null,
    status: 'PENDING',
    reviewNote: null,
    reviewedAt: null,
    createdAt: '2026-02-15T09:00:00Z',
    ...overrides,
  }
}

export function makeRemovalRequest(
  overrides: Partial<RemovalRequest> = {},
): RemovalRequest {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    photoId: makeUserPhoto().id,
    requestedByUserId: '3f1c2b4a-0000-4000-8000-000000000001',
    reason: 'The photograph identifies a student without consent.',
    status: 'PENDING',
    resolutionNote: null,
    handledByUserId: null,
    handledAt: null,
    createdAt: '2026-02-16T09:00:00Z',
    ...overrides,
  }
}

export function makeUploadAuthorization(
  overrides: Partial<UploadAuthorization> = {},
): UploadAuthorization {
  return {
    authorizationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    cloudName: 'gecs-test',
    apiKey: 'test-key',
    uploadUrl: 'https://api.cloudinary.com/v1_1/gecs-test/image/upload',
    uploadPreset: 'archive-test',
    folder: 'gecs-archive',
    publicId: 'gecs-archive/submissions/77777777/test-asset',
    timestamp: 1_800_000_000,
    signature: 'signed-value',
    expiresAt: '2026-02-15T09:10:00Z',
    maxFileSizeBytes: 15 * 1024 * 1024,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    ...overrides,
  }
}

export function makeRegisteredPhoto(
  overrides: Partial<RegisteredPhoto> = {},
): RegisteredPhoto {
  return {
    id: makeUserPhoto().id,
    submissionId: makeSubmission().id,
    title: 'Opening ceremony',
    caption: null,
    altText: null,
    format: 'jpg',
    widthPx: 1600,
    heightPx: 1067,
    sizeBytes: 2_400_000,
    takenAt: '2026-02-14T09:30:00Z',
    status: 'PENDING',
    photographers: [{ contributorProfileId: null, creditName: 'Asha Verma', creditOrder: 0 }],
    ...overrides,
  }
}

export function makeModerationPhoto(
  overrides: Partial<ModerationPhoto> = {},
): ModerationPhoto {
  return {
    id: 'b1111111-1111-4111-8111-111111111111',
    submissionId: makeSubmission().id,
    eventId: makeEvent().id,
    eventTitle: makeEvent().title,
    albumId: makeAlbumSummary().id,
    albumTitle: makeAlbumSummary().title,
    title: 'Opening ceremony',
    caption: 'The ceremony begins on the main lawn.',
    altText: 'Students gathered on the main lawn during the opening ceremony',
    format: 'jpg',
    cloudinaryPublicId: 'gecs-test/submissions/b1111111/asset',
    widthPx: 1600,
    heightPx: 1067,
    sizeBytes: 2_400_000,
    takenAt: '2026-02-14T09:30:00Z',
    status: 'PENDING',
    uploadedByUserId: '3f1c2b4a-0000-4000-8000-000000000001',
    uploaderDisplayName: 'Asha Verma',
    approvedByUserId: null,
    approvedAt: null,
    createdAt: '2026-02-15T09:00:00Z',
    photographers: [
      { contributorProfileId: null, creditName: 'Asha Verma', creditOrder: 0 },
    ],
    ...overrides,
  }
}

export function makeModerationHistoryEntry(
  overrides: Partial<ModerationHistoryEntry> = {},
): ModerationHistoryEntry {
  return {
    id: 'b2222222-2222-4222-8222-222222222222',
    action: 'SUBMIT',
    actorRole: 'USER',
    actorDisplayName: 'Asha Verma',
    fromStatus: null,
    toStatus: 'PENDING',
    reason: null,
    createdAt: '2026-02-15T09:00:00Z',
    ...overrides,
  }
}

export function makeAdminAlbum(
  overrides: Partial<AdminAlbum> = {},
): AdminAlbum {
  return {
    id: makeAlbumSummary().id,
    title: makeAlbumSummary().title,
    slug: makeAlbumSummary().slug,
    description: makeAlbumSummary().description,
    published: true,
    sortOrder: 0,
    eventId: makeEvent().id,
    eventTitle: makeEvent().title,
    eventSlug: makeEvent().slug,
    ...overrides,
  }
}

export function makeAdminPhotoSummary(
  overrides: Partial<AdminPhotoSummary> = {},
): AdminPhotoSummary {
  return {
    id: makeModerationPhoto().id,
    title: makeModerationPhoto().title,
    format: makeModerationPhoto().format,
    cloudinaryPublicId: makeModerationPhoto().cloudinaryPublicId,
    widthPx: makeModerationPhoto().widthPx,
    heightPx: makeModerationPhoto().heightPx,
    status: 'APPROVED',
    eventId: makeEvent().id,
    eventTitle: makeEvent().title,
    albumId: makeAlbumSummary().id,
    albumTitle: makeAlbumSummary().title,
    uploadedByUserId: makeModerationPhoto().uploadedByUserId,
    uploaderDisplayName: makeModerationPhoto().uploaderDisplayName,
    createdAt: makeModerationPhoto().createdAt,
    ...overrides,
  }
}

export function makeAdminReport(
  overrides: Partial<AdminReport> = {},
): AdminReport {
  return {
    id: 'c1111111-1111-4111-8111-111111111111',
    photoId: makeAdminPhotoSummary().id,
    photo: makeAdminPhotoSummary(),
    reportedByUserId: '3f1c2b4a-0000-4000-8000-000000000001',
    category: 'PRIVACY',
    details: 'A student is identifiable without consent.',
    status: 'PENDING',
    resolutionNote: null,
    handledByUserId: null,
    handledAt: null,
    createdAt: '2026-02-16T09:00:00Z',
    ...overrides,
  }
}

export function makeAdminRemovalRequest(
  overrides: Partial<AdminRemovalRequest> = {},
): AdminRemovalRequest {
  return {
    id: 'c2222222-2222-4222-8222-222222222222',
    photoId: makeAdminPhotoSummary().id,
    photo: makeAdminPhotoSummary(),
    requestedByUserId: '3f1c2b4a-0000-4000-8000-000000000001',
    reason: 'The subject asked for the photograph to be taken down.',
    status: 'PENDING',
    resolutionNote: null,
    handledByUserId: null,
    handledAt: null,
    createdAt: '2026-02-17T09:00:00Z',
    ...overrides,
  }
}
