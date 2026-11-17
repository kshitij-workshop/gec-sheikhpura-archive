package com.gecarchive.archive.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.archive.dto.AcademicYearResponse;
import com.gecarchive.archive.dto.AlbumDetailResponse;
import com.gecarchive.archive.dto.AlbumSummaryResponse;
import com.gecarchive.archive.dto.CategoryResponse;
import com.gecarchive.archive.dto.EventResponse;
import com.gecarchive.archive.dto.PublicPhotoResponse;
import com.gecarchive.archive.dto.RecentPhotoResponse;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.photo.repository.PhotoPhotographerRepository;
import com.gecarchive.photo.repository.PhotoRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;

@Service
public class PublicArchiveService {

    private final AcademicYearRepository academicYears;
    private final CategoryRepository categories;
    private final EventRepository events;
    private final AlbumRepository albums;
    private final PhotoRepository photos;
    private final PhotoPhotographerRepository photographers;

    public PublicArchiveService(AcademicYearRepository academicYears, CategoryRepository categories,
            EventRepository events, AlbumRepository albums, PhotoRepository photos,
            PhotoPhotographerRepository photographers) {
        this.academicYears = academicYears;
        this.categories = categories;
        this.events = events;
        this.albums = albums;
        this.photos = photos;
        this.photographers = photographers;
    }

    @Transactional(readOnly = true)
    public List<AcademicYearResponse> academicYears() {
        return academicYears.findAllByOrderByStartDateDesc().stream().map(AcademicYearResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> categories() {
        return categories.findByActiveTrueOrderBySortOrderAscNameAsc().stream().map(CategoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<EventResponse> events(int page, int size, String query, UUID academicYearId, UUID categoryId,
            Boolean featured) {
        var pageable = PageRequest.of(Math.max(0, page), bounded(size),
                Sort.by(Sort.Direction.DESC, "eventDate").and(Sort.by(Sort.Direction.ASC, "id")));
        var result = events.findAll(publicEventSpecification(query, academicYearId, categoryId, featured), pageable);
        return PageResponse.from(result, event -> EventResponse.from(event, publicAlbums(event)));
    }

    private Specification<Event> publicEventSpecification(
            String query, UUID academicYearId, UUID categoryId, Boolean featured) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("published")));
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (query != null && !query.isBlank()) {
                String pattern = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.like(cb.lower(root.get("title")), pattern));
            }
            if (academicYearId != null) {
                predicates.add(cb.equal(root.get("academicYear").get("id"), academicYearId));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (featured != null) {
                predicates.add(cb.equal(root.get("featured"), featured));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    @Transactional(readOnly = true)
    public EventResponse event(UUID id) {
        return eventResponse(events.findByIdAndPublishedTrueAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found.")));
    }

    @Transactional(readOnly = true)
    public EventResponse eventBySlug(String slug) {
        return eventResponse(events.findBySlugAndPublishedTrueAndDeletedAtIsNull(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found.")));
    }

    @Transactional(readOnly = true)
    public AlbumDetailResponse album(UUID id, int page, int size) {
        return album(id, page, size, null);
    }

    @Transactional(readOnly = true)
    public AlbumDetailResponse album(UUID id, int page, int size, UUID viewerId) {
        Album album = albums.findByIdAndPublishedTrueAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Album not found."));
        Event event = album.getEvent();
        if (!event.isPublished() || event.isDeleted()) throw new ResourceNotFoundException("Album not found.");
        var result = photos.findPublicByAlbumId(id, PageRequest.of(Math.max(0, page), bounded(size),
                Sort.by("sortOrder").ascending().and(Sort.by("createdAt").ascending())));
        return AlbumDetailResponse.from(album, eventResponse(event), publicPhotos(result, viewerId));
    }

    @Transactional(readOnly = true)
    public AlbumDetailResponse albumBySlug(String slug, int page, int size) {
        return albumBySlug(slug, page, size, null);
    }

    @Transactional(readOnly = true)
    public AlbumDetailResponse albumBySlug(String slug, int page, int size, UUID viewerId) {
        Album album = albums.findBySlugAndPublishedTrueAndDeletedAtIsNull(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Album not found."));
        return album(album.getId(), page, size, viewerId);
    }

    @Transactional(readOnly = true)
    public PublicPhotoResponse photo(UUID id) {
        return photo(id, null);
    }

    @Transactional(readOnly = true)
    public PublicPhotoResponse photo(UUID id, UUID viewerId) {
        Photo photo = photos.findPublicById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found."));
        return PublicPhotoResponse.from(photo,
                photographers.findByPhoto_IdOrderByCreditOrderAsc(id), viewerId);
    }

    @Transactional(readOnly = true)
    public PageResponse<RecentPhotoResponse> recentPhotos(int page, int size) {
        return recentPhotos(page, size, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<RecentPhotoResponse> recentPhotos(int page, int size, UUID viewerId) {
        var result = photos.findPublicRecentlyApproved(
                PageRequest.of(Math.max(0, page), bounded(size)));
        Map<UUID, List<PhotoPhotographer>> creditsByPhoto = creditsByPhoto(
                result.getContent().stream().map(Photo::getId).toList());
        return PageResponse.from(result, photo -> RecentPhotoResponse.from(photo,
                creditsByPhoto.getOrDefault(photo.getId(), List.of()), viewerId));
    }

    /**
     * Adds photographer credits to a page of public photos with one batched
     * query, so gallery pages do not issue a credit query per photograph.
     */
    private PageResponse<PublicPhotoResponse> publicPhotos(Page<Photo> page, UUID viewerId) {
        Map<UUID, List<PhotoPhotographer>> creditsByPhoto = creditsByPhoto(
                page.getContent().stream().map(Photo::getId).toList());
        return PageResponse.from(page, photo -> PublicPhotoResponse.from(photo,
                creditsByPhoto.getOrDefault(photo.getId(), List.of()), viewerId));
    }

    private Map<UUID, List<PhotoPhotographer>> creditsByPhoto(List<UUID> photoIds) {
        return photoIds.isEmpty()
                ? Map.of()
                : photographers.findByPhoto_IdInOrderByPhoto_IdAscCreditOrderAsc(photoIds).stream()
                        .collect(Collectors.groupingBy(credit -> credit.getPhoto().getId()));
    }

    private EventResponse eventResponse(Event event) {
        return EventResponse.from(event, publicAlbums(event));
    }

    private List<AlbumSummaryResponse> publicAlbums(Event event) {
        return albums.findByEvent_IdAndPublishedTrueAndDeletedAtIsNullOrderBySortOrderAsc(event.getId())
                .stream().map(AlbumSummaryResponse::from).toList();
    }

    private int bounded(int size) { return Math.min(Math.max(1, size), 100); }
}
