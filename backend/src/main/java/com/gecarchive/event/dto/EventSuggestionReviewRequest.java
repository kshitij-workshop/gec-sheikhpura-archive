package com.gecarchive.event.dto;

import com.gecarchive.event.entity.SuggestionStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Administrative review of an event suggestion.
 *
 * <p>Set {@code createEvent} to true to materialise the suggestion as a new
 * draft event in the same transaction; that requires APPROVED status plus a
 * date, category and academic year on the suggestion.</p>
 */
public record EventSuggestionReviewRequest(
        @NotNull SuggestionStatus status,
        @Size(max = 1000) String reviewNote,
        Boolean createEvent) {
}
