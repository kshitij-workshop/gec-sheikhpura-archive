package com.gecarchive.event.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.event.entity.EventSuggestion;

/**
 * The suggester's view of an event suggestion.
 *
 * <p>Category and academic-year labels are included so tracking views do not
 * have to resolve identifiers, and because the referenced records may no
 * longer be publicly listed.</p>
 */
public record EventSuggestionResponse(
        UUID id,
        String title,
        String description,
        LocalDate approximateDate,
        UUID categoryId,
        String categoryName,
        UUID academicYearId,
        String academicYearLabel,
        UUID suggestedByUserId,
        UUID reviewedByUserId,
        UUID createdEventId,
        String status,
        String reviewNote,
        Instant reviewedAt,
        Instant createdAt) {

    public static EventSuggestionResponse from(EventSuggestion suggestion) {
        return new EventSuggestionResponse(
                suggestion.getId(),
                suggestion.getTitle(),
                suggestion.getDescription(),
                suggestion.getApproximateDate(),
                suggestion.getCategory() == null ? null : suggestion.getCategory().getId(),
                suggestion.getCategory() == null ? null : suggestion.getCategory().getName(),
                suggestion.getAcademicYear() == null ? null : suggestion.getAcademicYear().getId(),
                suggestion.getAcademicYear() == null ? null : suggestion.getAcademicYear().getLabel(),
                suggestion.getSuggestedBy().getId(),
                suggestion.getReviewedBy() == null ? null : suggestion.getReviewedBy().getId(),
                suggestion.getCreatedEvent() == null ? null : suggestion.getCreatedEvent().getId(),
                suggestion.getStatus().name(),
                suggestion.getReviewNote(),
                suggestion.getReviewedAt(),
                suggestion.getCreatedAt());
    }
}
