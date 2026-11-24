package com.gecarchive.moderation.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoRemovalRequest;

/**
 * A removal request as an administrator sees it.
 *
 * <p>{@code photo} carries the identifying context a moderator needs to judge
 * the request without leaving the queue. The uploader's creation response
 * deliberately omits it through {@link #created(PhotoRemovalRequest)}.</p>
 */
public record RemovalRequestResponse(
        UUID id,
        UUID photoId,
        AdminPhotoSummary photo,
        UUID requestedByUserId,
        String reason,
        String status,
        String resolutionNote,
        UUID handledByUserId,
        Instant handledAt,
        Instant createdAt) {

    /** Administrative read model with identifying photograph context. */
    public static RemovalRequestResponse from(PhotoRemovalRequest request) {
        return build(request, AdminPhotoSummary.from(request.getPhoto()));
    }

    /** The uploader's confirmation; it carries no administrative context. */
    public static RemovalRequestResponse created(PhotoRemovalRequest request) {
        return build(request, null);
    }

    private static RemovalRequestResponse build(PhotoRemovalRequest request, AdminPhotoSummary photo) {
        return new RemovalRequestResponse(
                request.getId(),
                request.getPhoto().getId(),
                photo,
                request.getRequestedBy().getId(),
                request.getReason(),
                request.getStatus().name(),
                request.getResolutionNote(),
                request.getHandledBy() == null ? null : request.getHandledBy().getId(),
                request.getHandledAt(),
                request.getCreatedAt());
    }
}
