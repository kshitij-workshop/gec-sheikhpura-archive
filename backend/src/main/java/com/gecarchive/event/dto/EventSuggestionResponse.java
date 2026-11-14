package com.gecarchive.event.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.event.entity.EventSuggestion;

public record EventSuggestionResponse(
        UUID id,
        String title,
        String description,
        LocalDate approximateDate,
        UUID categoryId,
        UUID academicYearId,
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
                suggestion.getAcademicYear() == null ? null : suggestion.getAcademicYear().getId(),
                suggestion.getSuggestedBy().getId(),
                suggestion.getReviewedBy() == null ? null : suggestion.getReviewedBy().getId(),
                suggestion.getCreatedEvent() == null ? null : suggestion.getCreatedEvent().getId(),
                suggestion.getStatus().name(),
                suggestion.getReviewNote(),
                suggestion.getReviewedAt(),
                suggestion.getCreatedAt());
    }
}
