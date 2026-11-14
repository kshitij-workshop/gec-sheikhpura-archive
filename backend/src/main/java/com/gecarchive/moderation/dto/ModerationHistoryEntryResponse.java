package com.gecarchive.moderation.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoModeration;

public record ModerationHistoryEntryResponse(
        UUID id,
        String action,
        String actorRole,
        String actorDisplayName,
        String fromStatus,
        String toStatus,
        String reason,
        Instant createdAt) {

    public static ModerationHistoryEntryResponse from(PhotoModeration entry) {
        return new ModerationHistoryEntryResponse(
                entry.getId(),
                entry.getAction().name(),
                entry.getActorRole().name(),
                entry.getActorDisplayName(),
                entry.getFromStatus() == null ? null : entry.getFromStatus().name(),
                entry.getToStatus().name(),
                entry.getReason(),
                entry.getCreatedAt());
    }
}
