package com.gecarchive.moderation.dto;

import com.gecarchive.moderation.entity.ReportStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Administrative report resolution.
 *
 * <p>{@code status} must be UNDER_REVIEW, RESOLVED or DISMISSED. A non-blank
 * {@code resolutionNote} is required for the terminal states.</p>
 */
public record ReportResolutionRequest(
        @NotNull ReportStatus status,
        @Size(max = 1000) String resolutionNote) {
}
