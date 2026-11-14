package com.gecarchive.archive.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.gecarchive.event.entity.Event;

public record EventResponse(
        UUID id,
        String title,
        String slug,
        String description,
        LocalDate eventDate,
        String location,
        boolean published,
        boolean featured,
        AcademicYearResponse academicYear,
        CategoryResponse category,
        List<AlbumSummaryResponse> albums) {

    public static EventResponse from(Event event, List<AlbumSummaryResponse> albums) {
        return new EventResponse(event.getId(), event.getTitle(), event.getSlug(), event.getDescription(),
                event.getEventDate(), event.getLocation(), event.isPublished(), event.isFeatured(),
                AcademicYearResponse.from(event.getAcademicYear()), CategoryResponse.from(event.getCategory()),
                List.copyOf(albums));
    }
}
