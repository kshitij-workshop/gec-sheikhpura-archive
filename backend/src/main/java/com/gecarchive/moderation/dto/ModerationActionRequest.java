package com.gecarchive.moderation.dto;

import java.util.UUID;

import jakarta.validation.constraints.Size;

/**
 * Body for every photo moderation action.
 *
 * <p>{@code reason} is required for REJECT, FLAG, HIDE, REMOVE and RESTORE.
 * APPROVE consumes {@code albumId} to assign or move the photograph, and an
 * optional {@code eventId} that must match the album's event. When any of
 * {@code title}, {@code caption} or {@code altText} is supplied, APPROVE also
 * rewrites those display details.</p>
 */
public record ModerationActionRequest(
        @Size(max = 1000) String reason,
        UUID albumId,
        UUID eventId,
        @Size(max = 160) String title,
        @Size(max = 2000) String caption,
        @Size(max = 300) String altText) {
}
