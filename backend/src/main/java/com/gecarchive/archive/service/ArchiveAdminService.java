package com.gecarchive.archive.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.archive.dto.AcademicYearRequest;
import com.gecarchive.archive.dto.AcademicYearResponse;
import com.gecarchive.archive.dto.AlbumRequest;
import com.gecarchive.archive.dto.AlbumResponse;
import com.gecarchive.archive.dto.CategoryRequest;
import com.gecarchive.archive.dto.CategoryResponse;
import com.gecarchive.archive.dto.EventRequest;
import com.gecarchive.archive.dto.EventResponse;
import com.gecarchive.archive.dto.AlbumSummaryResponse;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.common.text.Slugs;
import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Category;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ArchiveAdminService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AcademicYearRepository academicYears;
    private final CategoryRepository categories;
    private final EventRepository events;
    private final AlbumRepository albums;
    private final UserRepository users;
    private final AuditService audit;

    public ArchiveAdminService(
            AcademicYearRepository academicYears,
            CategoryRepository categories,
            EventRepository events,
            AlbumRepository albums,
            UserRepository users,
            AuditService audit) {
        this.academicYears = academicYears;
        this.categories = categories;
        this.events = events;
        this.albums = albums;
        this.users = users;
        this.audit = audit;
    }

    @Transactional
    public AcademicYearResponse createAcademicYear(AcademicYearRequest request, AuthenticatedUser actor,
            ClientInfo client) {
        validateDates(request.startDate(), request.endDate());
        if (academicYears.existsByLabelIgnoreCase(request.label().trim())) {
            throw new ConflictException("An academic year with this label already exists.");
        }
        AcademicYear year = new AcademicYear();
        apply(year, request);
        academicYears.save(year);
        record(actor, "ACADEMIC_YEAR_CREATED", "ACADEMIC_YEAR", year.getId(), null,
                Map.of("label", year.getLabel()), client);
        return AcademicYearResponse.from(year);
    }

    @Transactional
    public AcademicYearResponse updateAcademicYear(UUID id, AcademicYearRequest request, AuthenticatedUser actor,
            ClientInfo client) {
        validateDates(request.startDate(), request.endDate());
        AcademicYear year = academicYear(id);
        if (!year.getLabel().equalsIgnoreCase(request.label().trim())
                && academicYears.existsByLabelIgnoreCase(request.label().trim())) {
            throw new ConflictException("An academic year with this label already exists.");
        }
        Map<String, Object> before = Map.of("label", year.getLabel(), "startDate", year.getStartDate().toString(),
                "endDate", year.getEndDate().toString());
        apply(year, request);
        academicYears.save(year);
        record(actor, "ACADEMIC_YEAR_UPDATED", "ACADEMIC_YEAR", id, before,
                Map.of("label", year.getLabel(), "startDate", year.getStartDate().toString(),
                        "endDate", year.getEndDate().toString()), client);
        return AcademicYearResponse.from(year);
    }

    @Transactional
    public void deleteAcademicYear(UUID id, AuthenticatedUser actor, ClientInfo client) {
        AcademicYear year = academicYear(id);
        academicYears.delete(year);
        record(actor, "ACADEMIC_YEAR_DELETED", "ACADEMIC_YEAR", id,
                Map.of("label", year.getLabel()), null, client);
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request, AuthenticatedUser actor, ClientInfo client) {
        String slug = slug(request.slug(), request.name());
        ensureCategoryUnique(request.name(), slug, null);
        Category category = new Category();
        apply(category, request, slug);
        categories.save(category);
        record(actor, "CATEGORY_CREATED", "CATEGORY", category.getId(), null,
                Map.of("name", category.getName(), "slug", category.getSlug()), client);
        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse updateCategory(UUID id, CategoryRequest request, AuthenticatedUser actor,
            ClientInfo client) {
        Category category = category(id);
        String slug = slug(request.slug(), request.name());
        ensureCategoryUnique(request.name(), slug, id);
        Map<String, Object> before = Map.of("name", category.getName(), "slug", category.getSlug(),
                "active", category.isActive());
        apply(category, request, slug);
        categories.save(category);
        record(actor, "CATEGORY_UPDATED", "CATEGORY", id, before,
                Map.of("name", category.getName(), "slug", category.getSlug(), "active", category.isActive()), client);
        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse deactivateCategory(UUID id, AuthenticatedUser actor, ClientInfo client) {
        Category category = category(id);
        category.setActive(false);
        categories.save(category);
        record(actor, "CATEGORY_DEACTIVATED", "CATEGORY", id, Map.of("active", true),
                Map.of("active", false), client);
        return CategoryResponse.from(category);
    }

    @Transactional
    public EventResponse createEvent(EventRequest request, AuthenticatedUser actor, ClientInfo client) {
        AcademicYear year = academicYear(request.academicYearId());
        Category category = category(request.categoryId());
        validateEventDate(request.eventDate(), year);
        String slug = uniqueSlug(request.slug(), request.title(), events::findBySlug);
        User creator = user(actor.id());
        Event event = new Event();
        event.setAcademicYear(year);
        event.setCategory(category);
        event.setCreatedBy(creator);
        apply(event, request, slug);
        events.save(event);
        record(actor, "EVENT_CREATED", "EVENT", event.getId(), null,
                Map.of("title", event.getTitle(), "slug", event.getSlug()), client);
        return EventResponse.from(event, java.util.List.of());
    }

    @Transactional
    public EventResponse updateEvent(UUID id, EventRequest request, AuthenticatedUser actor, ClientInfo client) {
        Event event = event(id);
        AcademicYear year = academicYear(request.academicYearId());
        Category category = category(request.categoryId());
        validateEventDate(request.eventDate(), year);
        String slug = request.slug() == null || request.slug().isBlank() ? event.getSlug() : Slugs.normalize(request.slug());
        events.findBySlug(slug).filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> { throw new ConflictException("An event with this slug already exists."); });
        Map<String, Object> before = Map.of("title", event.getTitle(), "slug", event.getSlug(),
                "published", event.isPublished());
        event.setAcademicYear(year);
        event.setCategory(category);
        apply(event, request, slug);
        events.save(event);
        record(actor, "EVENT_UPDATED", "EVENT", id, before,
                Map.of("title", event.getTitle(), "slug", event.getSlug(), "published", event.isPublished()), client);
        return EventResponse.from(event, java.util.List.of());
    }

    @Transactional
    public EventResponse archiveEvent(UUID id, AuthenticatedUser actor, ClientInfo client) {
        Event event = event(id);
        event.setPublished(false);
        event.setDeletedAt(Instant.now());
        events.save(event);
        record(actor, "EVENT_ARCHIVED", "EVENT", id, Map.of("published", true),
                Map.of("published", false), client);
        return EventResponse.from(event, java.util.List.of());
    }

    @Transactional
    public AlbumResponse createAlbum(AlbumRequest request, AuthenticatedUser actor, ClientInfo client) {
        Event event = event(request.eventId());
        String title = request.title().trim();
        if (albums.existsByEvent_IdAndTitleIgnoreCaseAndDeletedAtIsNull(event.getId(), title)) {
            throw new ConflictException("This event already has an album with this title.");
        }
        String slug = albumSlug(request.slug(), title);
        Album album = new Album();
        album.setEvent(event);
        album.setCreatedBy(user(actor.id()));
        apply(album, request, slug);
        albums.save(album);
        record(actor, "ALBUM_CREATED", "ALBUM", album.getId(), null,
                Map.of("title", album.getTitle(), "slug", album.getSlug()), client);
        return AlbumResponse.from(album);
    }

    @Transactional
    public AlbumResponse updateAlbum(UUID id, AlbumRequest request, AuthenticatedUser actor, ClientInfo client) {
        Album album = album(id);
        Event event = event(request.eventId());
        String title = request.title().trim();
        if (albums.existsByEvent_IdAndTitleIgnoreCaseAndDeletedAtIsNullAndIdNot(event.getId(), title, id)) {
            throw new ConflictException("This event already has an album with this title.");
        }
        String slug = request.slug() == null || request.slug().isBlank() ? album.getSlug() : Slugs.normalize(request.slug());
        albums.findBySlug(slug).filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> { throw new ConflictException("An album with this slug already exists."); });
        Map<String, Object> before = Map.of("title", album.getTitle(), "slug", album.getSlug(),
                "published", album.isPublished());
        album.setEvent(event);
        apply(album, request, slug);
        albums.save(album);
        record(actor, "ALBUM_UPDATED", "ALBUM", id, before,
                Map.of("title", album.getTitle(), "slug", album.getSlug(), "published", album.isPublished()), client);
        return AlbumResponse.from(album);
    }

    @Transactional
    public AlbumResponse archiveAlbum(UUID id, AuthenticatedUser actor, ClientInfo client) {
        Album album = album(id);
        album.setPublished(false);
        album.setDeletedAt(Instant.now());
        albums.save(album);
        record(actor, "ALBUM_ARCHIVED", "ALBUM", id, Map.of("published", true),
                Map.of("published", false), client);
        return AlbumResponse.from(album);
    }

    @Transactional(readOnly = true)
    public Page<EventResponse> listEvents(int page, int size) {
        return events.findAll(PageRequest.of(Math.max(0, page), bounded(size), Sort.by("eventDate").descending()))
                .map(event -> EventResponse.from(event, albums.findByEvent_IdAndPublishedTrueAndDeletedAtIsNullOrderBySortOrderAsc(event.getId())
                        .stream().map(AlbumSummaryResponse::from).toList()));
    }

    @Transactional(readOnly = true)
    public java.util.List<AcademicYearResponse> listAcademicYears() {
        return academicYears.findAllByOrderByStartDateDesc().stream().map(AcademicYearResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<CategoryResponse> listCategories() {
        return categories.findAll(Sort.by(Sort.Direction.ASC, "sortOrder", "name")).stream()
                .map(com.gecarchive.archive.dto.CategoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<AlbumResponse> listAlbums(UUID eventId) {
        event(eventId);
        return albums.findByEvent_IdOrderBySortOrderAsc(eventId).stream().map(AlbumResponse::from).toList();
    }

    private void apply(AcademicYear year, AcademicYearRequest request) {
        year.setLabel(request.label().trim());
        year.setStartDate(request.startDate());
        year.setEndDate(request.endDate());
    }

    private void apply(Category category, CategoryRequest request, String slug) {
        category.setName(request.name().trim());
        category.setSlug(slug);
        category.setDescription(blankToNull(request.description()));
        category.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        if (request.active() != null) category.setActive(request.active());
    }

    private void apply(Event event, EventRequest request, String slug) {
        event.setTitle(request.title().trim());
        event.setSlug(slug);
        event.setDescription(blankToNull(request.description()));
        event.setEventDate(request.eventDate());
        event.setLocation(blankToNull(request.location()));
        if (request.published() != null) event.setPublished(request.published());
        if (request.featured() != null) event.setFeatured(request.featured());
    }

    private void apply(Album album, AlbumRequest request, String slug) {
        album.setTitle(request.title().trim());
        album.setSlug(slug);
        album.setDescription(blankToNull(request.description()));
        album.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        if (request.published() != null) album.setPublished(request.published());
    }

    private void validateDates(java.time.LocalDate start, java.time.LocalDate end) {
        if (!start.isBefore(end)) throw new BadRequestException("The academic year start date must be before its end date.");
    }

    private void validateEventDate(java.time.LocalDate date, AcademicYear year) {
        if (date.isBefore(year.getStartDate()) || date.isAfter(year.getEndDate())) {
            throw new BadRequestException("The event date must fall within the selected academic year.");
        }
    }

    private String slug(String requested, String fallback) {
        String value = Slugs.normalize(requested == null || requested.isBlank() ? fallback : requested);
        if (value == null || value.isBlank()) throw new BadRequestException("A valid slug is required.");
        return value;
    }

    private String uniqueSlug(String requested, String fallback, java.util.function.Function<String, java.util.Optional<?>> lookup) {
        String value = slug(requested, fallback);
        if (lookup.apply(value).isPresent()) throw new ConflictException("A resource with this slug already exists.");
        return value;
    }

    /**
     * Album slugs are public URLs, so they stay globally unique even though
     * album titles only need to be unique within their event. A generated slug
     * is disambiguated with a numeric suffix; an explicitly requested slug is
     * rejected on collision so the administrator sees the conflict.
     */
    private String albumSlug(String requested, String title) {
        if (requested != null && !requested.isBlank()) {
            return uniqueSlug(requested, title, albums::findBySlug);
        }
        String base = slug(null, title);
        if (albums.findBySlug(base).isEmpty()) {
            return base;
        }
        for (int suffix = 2; suffix <= 100; suffix++) {
            String candidate = base + "-" + suffix;
            if (albums.findBySlug(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new ConflictException("Could not derive a unique album slug. Supply one explicitly.");
    }

    private void ensureCategoryUnique(String name, String slug, UUID currentId) {
        categories.findBySlug(slug).filter(value -> !value.getId().equals(currentId))
                .ifPresent(value -> { throw new ConflictException("A category with this slug already exists."); });
        if (categories.existsByNameIgnoreCase(name.trim())
                && (currentId == null || !categoryByName(name).getId().equals(currentId))) {
            throw new ConflictException("A category with this name already exists.");
        }
    }

    private Category categoryByName(String name) {
        return categories.findAll().stream().filter(value -> value.getName().equalsIgnoreCase(name.trim())).findFirst()
                .orElseThrow();
    }

    private AcademicYear academicYear(UUID id) { return academicYears.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Academic year not found.")); }
    private Category category(UUID id) { return categories.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found.")); }
    private Event event(UUID id) { return events.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found.")); }
    private Album album(UUID id) { return albums.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Album not found.")); }
    private User user(UUID id) { return users.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Actor not found.")); }

    private int bounded(int size) { return Math.min(Math.max(1, size), MAX_PAGE_SIZE); }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private void record(AuthenticatedUser actor, String action, String type, UUID id,
            Map<String, Object> before, Map<String, Object> after, ClientInfo client) {
        audit.record(user(actor.id()), action, type, id, before, after, client);
    }
}
