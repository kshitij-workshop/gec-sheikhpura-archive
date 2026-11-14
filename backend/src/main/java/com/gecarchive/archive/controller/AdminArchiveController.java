package com.gecarchive.archive.controller;

import java.util.UUID;
import java.util.List;

import com.gecarchive.archive.dto.AcademicYearRequest;
import com.gecarchive.archive.dto.AcademicYearResponse;
import com.gecarchive.archive.dto.AlbumRequest;
import com.gecarchive.archive.dto.AlbumResponse;
import com.gecarchive.archive.dto.CategoryRequest;
import com.gecarchive.archive.dto.CategoryResponse;
import com.gecarchive.archive.dto.EventRequest;
import com.gecarchive.archive.dto.EventResponse;
import com.gecarchive.archive.service.ArchiveAdminService;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminArchiveController {

    private final ArchiveAdminService archive;

    public AdminArchiveController(ArchiveAdminService archive) {
        this.archive = archive;
    }

    @GetMapping("/academic-years")
    public List<AcademicYearResponse> listYears() {
        return archive.listAcademicYears();
    }

    @GetMapping("/categories")
    public List<CategoryResponse> listCategories() {
        return archive.listCategories();
    }

    @GetMapping("/events")
    public PageResponse<EventResponse> listEvents(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "24") int size) {
        return PageResponse.from(archive.listEvents(page, size));
    }

    @GetMapping("/albums")
    public List<AlbumResponse> listAlbums(@org.springframework.web.bind.annotation.RequestParam UUID eventId) {
        return archive.listAlbums(eventId);
    }

    @PostMapping("/academic-years")
    public ResponseEntity<AcademicYearResponse> createYear(@Valid @RequestBody AcademicYearRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(archive.createAcademicYear(request, actor, ClientInfo.from(httpRequest)));
    }

    @PatchMapping("/academic-years/{id}")
    public AcademicYearResponse updateYear(@PathVariable UUID id, @Valid @RequestBody AcademicYearRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return archive.updateAcademicYear(id, request, actor, ClientInfo.from(httpRequest));
    }

    @DeleteMapping("/academic-years/{id}")
    public ResponseEntity<Void> deleteYear(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser actor,
            HttpServletRequest httpRequest) {
        archive.deleteAcademicYear(id, actor, ClientInfo.from(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(archive.createCategory(request, actor, ClientInfo.from(httpRequest)));
    }

    @PatchMapping("/categories/{id}")
    public CategoryResponse updateCategory(@PathVariable UUID id, @Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return archive.updateCategory(id, request, actor, ClientInfo.from(httpRequest));
    }

    @DeleteMapping("/categories/{id}")
    public CategoryResponse deactivateCategory(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser actor,
            HttpServletRequest httpRequest) {
        return archive.deactivateCategory(id, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/events")
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(archive.createEvent(request, actor, ClientInfo.from(httpRequest)));
    }

    @PatchMapping("/events/{id}")
    public EventResponse updateEvent(@PathVariable UUID id, @Valid @RequestBody EventRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return archive.updateEvent(id, request, actor, ClientInfo.from(httpRequest));
    }

    @DeleteMapping("/events/{id}")
    public EventResponse archiveEvent(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser actor,
            HttpServletRequest httpRequest) {
        return archive.archiveEvent(id, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/albums")
    public ResponseEntity<AlbumResponse> createAlbum(@Valid @RequestBody AlbumRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(archive.createAlbum(request, actor, ClientInfo.from(httpRequest)));
    }

    @PatchMapping("/albums/{id}")
    public AlbumResponse updateAlbum(@PathVariable UUID id, @Valid @RequestBody AlbumRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return archive.updateAlbum(id, request, actor, ClientInfo.from(httpRequest));
    }

    @DeleteMapping("/albums/{id}")
    public AlbumResponse archiveAlbum(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser actor,
            HttpServletRequest httpRequest) {
        return archive.archiveAlbum(id, actor, ClientInfo.from(httpRequest));
    }
}
