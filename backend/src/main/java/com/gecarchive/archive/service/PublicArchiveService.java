package com.gecarchive.archive.service;

import java.util.List;
import java.util.UUID;

import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.archive.dto.AcademicYearResponse;
import com.gecarchive.archive.dto.AlbumDetailResponse;
import com.gecarchive.archive.dto.AlbumSummaryResponse;
import com.gecarchive.archive.dto.CategoryResponse;
import com.gecarchive.archive.dto.EventResponse;
import com.gecarchive.archive.dto.PublicPhotoResponse;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.photo.repository.PhotoRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicArchiveService {

    private final AcademicYearRepository academicYears;
    private final CategoryRepository categories;
    private final EventRepository events;
    private final AlbumRepository albums;
    private final PhotoRepository photos;

    public PublicArchiveService(AcademicYearRepository academicYears, CategoryRepository categories,
            EventRepository events, AlbumRepository albums, PhotoRepository photos) {
        this.academicYears = academicYears;
        this.categories = categories;
        this.events = events;
        this.albums = albums;
        this.photos = photos;
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
    public PageResponse<EventResponse> events(int page, int size, String query) {
        var pageable = PageRequest.of(Math.max(0, page), bounded(size), Sort.by("eventDate").descending());
        var result = query == null || query.isBlank()
                ? events.findByPublishedTrueAndDeletedAtIsNull(pageable)
                : events.findByTitleContainingIgnoreCaseAndPublishedTrueAndDeletedAtIsNull(query.trim(), pageable);
        return PageResponse.from(result, event -> EventResponse.from(event, publicAlbums(event)));
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
        Album album = albums.findByIdAndPublishedTrueAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Album not found."));
        Event event = album.getEvent();
        if (!event.isPublished() || event.isDeleted()) throw new ResourceNotFoundException("Album not found.");
        var result = photos.findPublicByAlbumId(id, PageRequest.of(Math.max(0, page), bounded(size),
                Sort.by("sortOrder").ascending().and(Sort.by("createdAt").ascending())));
        return AlbumDetailResponse.from(album, eventResponse(event), PageResponse.from(result, PublicPhotoResponse::from));
    }

    @Transactional(readOnly = true)
    public AlbumDetailResponse albumBySlug(String slug, int page, int size) {
        Album album = albums.findBySlugAndPublishedTrueAndDeletedAtIsNull(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Album not found."));
        return album(album.getId(), page, size);
    }

    @Transactional(readOnly = true)
    public PublicPhotoResponse photo(UUID id) {
        return photos.findPublicById(id).map(PublicPhotoResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found."));
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
