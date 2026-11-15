package com.gecarchive.archive.controller;

import java.util.List;
import java.util.UUID;

import com.gecarchive.archive.dto.AcademicYearResponse;
import com.gecarchive.archive.dto.AlbumDetailResponse;
import com.gecarchive.archive.dto.CategoryResponse;
import com.gecarchive.archive.dto.EventResponse;
import com.gecarchive.archive.dto.PublicPhotoResponse;
import com.gecarchive.archive.service.PublicArchiveService;
import com.gecarchive.common.dto.PageResponse;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PublicArchiveController {

    private final PublicArchiveService archive;

    public PublicArchiveController(PublicArchiveService archive) {
        this.archive = archive;
    }

    @GetMapping("/academic-years")
    public List<AcademicYearResponse> academicYears() {
        return archive.academicYears();
    }

    @GetMapping("/categories")
    public List<CategoryResponse> categories() {
        return archive.categories();
    }

    @GetMapping("/events")
    public PageResponse<EventResponse> events(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) UUID academicYearId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean featured) {
        return archive.events(page, size, query, academicYearId, categoryId, featured);
    }

    @GetMapping("/events/{id}")
    public EventResponse event(@PathVariable UUID id) {
        return archive.event(id);
    }

    @GetMapping("/events/slug/{slug}")
    public EventResponse eventBySlug(@PathVariable String slug) {
        return archive.eventBySlug(slug);
    }

    @GetMapping("/albums/{id}")
    public AlbumDetailResponse album(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return archive.album(id, page, size);
    }

    @GetMapping("/albums/slug/{slug}")
    public AlbumDetailResponse albumBySlug(
            @PathVariable String slug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return archive.albumBySlug(slug, page, size);
    }

    @GetMapping("/photos/{id}")
    public PublicPhotoResponse photo(@PathVariable UUID id) {
        return archive.photo(id);
    }
}
