package com.gecarchive.moderation.dto;

import com.gecarchive.moderation.entity.RemovalRequestStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Administrative removal-request resolution.
 *
 * <p>{@code status} must be APPROVED or REJECTED. Approving also drives the
 * photograph through the REMOVE moderation transition in the same transaction.</p>
 */
public record RemovalRequestResolutionRequest(
        @NotNull RemovalRequestStatus status,
        @NotBlank @Size(max = 1000) String resolutionNote) {
}
