package com.gecarchive.moderation.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;

/**
 * The identifying photograph context embedded in administrative governance
 * queues.
 *
 * <p>A report or removal request is only actionable when a moderator can see
 * which photograph it concerns. This summary deliberately carries the
 * Cloudinary public ID so the image can be previewed in the role-protected
 * admin UI; it must never be used by a public or member-facing response.</p>
 */
public record AdminPhotoSummary(
        UUID id,
        String title,
        String format,
        String cloudinaryPublicId,
        int widthPx,
        int heightPx,
        String status,
        UUID eventId,
        String eventTitle,
        UUID albumId,
        String albumTitle,
        UUID uploadedByUserId,
        String uploaderDisplayName,
        Instant createdAt) {

    public static AdminPhotoSummary from(Photo photo) {
        return new AdminPhotoSummary(
                photo.getId(),
                photo.getTitle(),
                photo.getFormat(),
                photo.getCloudinaryPublicId(),
                photo.getWidthPx(),
                photo.getHeightPx(),
                photo.getStatus().name(),
                photo.getEvent().getId(),
                photo.getEvent().getTitle(),
                photo.getAlbum() == null ? null : photo.getAlbum().getId(),
                photo.getAlbum() == null ? null : photo.getAlbum().getTitle(),
                photo.getUploadedBy().getId(),
                photo.getUploadedBy().getDisplayName(),
                photo.getCreatedAt());
    }
}
