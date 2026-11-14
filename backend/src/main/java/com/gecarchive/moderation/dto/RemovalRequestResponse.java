package com.gecarchive.moderation.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoRemovalRequest;

public record RemovalRequestResponse(
        UUID id,
        UUID photoId,
        UUID requestedByUserId,
        String reason,
        String status,
        String resolutionNote,
        UUID handledByUserId,
        Instant handledAt,
        Instant createdAt) {

    public static RemovalRequestResponse from(PhotoRemovalRequest request) {
        return new RemovalRequestResponse(
                request.getId(),
                request.getPhoto().getId(),
                request.getRequestedBy().getId(),
                request.getReason(),
                request.getStatus().name(),
                request.getResolutionNote(),
                request.getHandledBy() == null ? null : request.getHandledBy().getId(),
                request.getHandledAt(),
                request.getCreatedAt());
    }
}
