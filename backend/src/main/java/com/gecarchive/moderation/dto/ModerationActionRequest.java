package com.gecarchive.moderation.dto;

import java.util.UUID;

import jakarta.validation.constraints.Size;

/**
 * Body for every photo moderation action.
 *
 * <p>{@code reason} is required for REJECT, FLAG, HIDE, REMOVE and RESTORE.
 * {@code albumId} is only consumed by APPROVE and may be omitted when the
 * photograph already carries an album.</p>
 */
public record ModerationActionRequest(
        @Size(max = 1000) String reason,
        UUID albumId) {
}
