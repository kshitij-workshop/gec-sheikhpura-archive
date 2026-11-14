# Product Requirements Document

## 1. Product

**Name:** GEC Sheikhpura Archive

**Institution:** Government Engineering College, Sheikhpura, Bihar, India

**Type:** Community-driven digital photography archive.

**Status:** Phase 00 foundation. This document describes the intended product; most features are not implemented yet.

## 2. Problem

Photographs from college events are scattered across personal devices, WhatsApp groups, Google Drive, Instagram, and individual photographer collections. There is no central, trustworthy place to preserve, organize, and explore the institution's photographic history.

## 3. Vision

Build a public digital archive that feels like a premium photography publication or digital museum, not a generic college management system.

The archive should:

1. Preserve institutional memories for future generations.
2. Present photographs beautifully and respectfully.
3. Make community contributions reliable and attributable.
4. Enforce strong moderation and content governance.
5. Protect privacy, data integrity, and security.
6. Remain fast and accessible on mobile devices.

## 4. Roles

Exactly four roles exist.

| Role | Description | Key permissions |
|---|---|---|
| `GUEST` | Unauthenticated visitor | Browse published events, albums, photographs, contributors; search and filter; share public links |
| `USER` | Registered, email-verified user | Upload photographs; suggest events; track submissions; update profile; request removal of eligible submissions; report photographs |
| `ADMIN` | Moderator and content manager | Create/edit events; manage albums and categories; review submissions; approve/reject photographs; handle reports; review event suggestions; manage ordinary users; view analytics and audit logs |
| `SUPER_ADMIN` | Full administrator | All admin permissions plus promote/demote administrators, manage super-admin privileges with safeguards, configure system settings, perform sensitive operations |

`GUEST` is an unauthenticated security state. It is not stored as a user's persisted role.

## 5. Core user journeys

### 5.1 Browse the archive

A visitor opens the homepage, explores featured events and albums, filters by academic year or category, opens an album, and views photographs in a responsive gallery and photo viewer.

### 5.2 Contribute photographs

A verified user selects photographs, validates them locally, requests a signed upload authorization, uploads directly to Cloudinary, submits metadata and photographer credits, and tracks the submission while it awaits moderation.

### 5.3 Moderate submissions

An administrator reviews pending photographs, checks metadata and attribution, approves or rejects with a reason, assigns approved photographs to an album, and triggers audit records for every action.

### 5.4 Report content

A visitor or user reports an inappropriate or unauthorized photograph. An administrator reviews the report and can hide or remove the content with a recorded reason.

### 5.5 Suggest an event

A user suggests a missing event with a title, approximate date, category, academic year, and supporting context. An administrator reviews the suggestion and may create an event from it.

## 6. Pages

### Public

- Homepage
- Archive
- Academic year archive
- Event details
- Album gallery
- Individual photo viewer
- Contributors
- About
- Contribute
- Login
- Registration

### User dashboard

- Dashboard overview
- My uploads
- New submission
- Profile
- Event suggestions

### Admin dashboard

- Dashboard overview
- Event management
- Album management
- Photo management
- Moderation queue
- User management
- Categories
- Reports
- Analytics
- Audit logs
- Settings

All pages must be responsive. Mobile photograph viewing is a priority.

## 7. Functional requirements

### 7.1 Archive

- Events belong to one academic year and one category.
- Albums belong to one event.
- Albums contain photographs.
- Public visitors can browse only published events, published albums, and approved photographs.
- Public search and filtering cover events, albums, categories, and academic years.

### 7.2 Contributions

- Only verified `USER`, `ADMIN`, and `SUPER_ADMIN` accounts may upload.
- Maximum 15 MB per image.
- Maximum 50 photographs per submission.
- Allowed formats: JPEG, PNG, WebP.
- Limits must be configurable.
- Uploader and photographer are distinct concepts.
- Multiple photographers must be supported.
- Every submission enters moderation.

### 7.3 Moderation

Photo states:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `FLAGGED`
- `HIDDEN`
- `REMOVED`

Only `ADMIN` and `SUPER_ADMIN` may moderate. Every action records the actor, timestamp, reason where applicable, and prior/new state.

### 7.4 Reports and removal

- Users can report inappropriate or unauthorized photographs.
- Administrators can resolve or dismiss reports.
- Content removal and privacy complaints must have a documented process.
- Removed content must not be publicly reachable.

### 7.5 Audit

Sensitive administrative operations must produce append-only audit records, including role changes, moderation actions, settings changes, and user-status changes.

## 8. Non-functional requirements

### Security

- Backend authorization is the only security boundary.
- Refresh tokens are stored in secure, `HttpOnly` cookies.
- Short-lived access tokens are kept in memory.
- CSRF protection applies to cookie-authenticated endpoints.
- CORS uses explicit allowlists.
- Uploaded assets are verified server-side.
- Private submissions are not exposed through public APIs or public image URLs.
- Rate limiting protects login, registration, password reset, and upload authorization.
- Secrets are supplied through environment variables and secret managers.

### Performance

- Design for thousands and eventually tens of thousands of photographs.
- Lazy-load images and use responsive Cloudinary transformations.
- Paginate galleries and search results.
- Use route-based code splitting.
- Avoid loading original images in grids.
- Add database indexes for frequent queries.
- Avoid N+1 queries and loading complete entity graphs for gallery pages.

### Accessibility

- Semantic HTML.
- Keyboard-operable navigation and photo viewer.
- Visible focus states.
- Sufficient color contrast.
- Alternative text and meaningful captions.
- Reduced-motion support.

### Privacy

- No facial recognition or automatic student identification.
- Strip unnecessary EXIF metadata, especially location data, before public display.
- Provide a takedown and privacy complaint process.
- Do not publish private submissions.
- Preserve attribution accurately.

## 9. Non-goals

- College ERP or student management.
- Attendance, grades, or admissions.
- Social feed, likes, or follower graph.
- Facial recognition.
- Automatic identification of people in photographs.
- Microservices, Kubernetes, or distributed systems.
- Elasticsearch or Redis without a demonstrated requirement.
- Native mobile applications in the initial scope.

## 10. Success criteria

- Visitors can find and view published photographs quickly on mobile and desktop.
- Contributors can submit photographs with accurate attribution and clear status tracking.
- Moderators can process submissions efficiently with a complete audit trail.
- Rejected or private content never appears publicly.
- The archive remains maintainable by a small team.
- The visual experience feels editorial and archival, not like a generic dashboard.

## 11. Open product questions

1. What is the official public domain name and institutional approval process?
2. What privacy policy, consent language, and takedown contact will the college require?
3. Who are the initial super administrators, and how will the first account be bootstrapped?
4. What are the initial academic years, categories, and event naming conventions?
5. Which production email provider will be used for verification and password reset?
6. Are there restrictions on publishing photographs of minors or identifiable individuals?
7. What retention and backup policy applies to submitted originals and removed content?
