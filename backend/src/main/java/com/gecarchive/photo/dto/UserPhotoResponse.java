package com.gecarchive.photo.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;

/**
 * The uploader's own view of a photograph.
 *
 * <p>No delivery URL is exposed: pending and rejected assets must stay
 * unreachable through public image URLs.</p>
 */
public record UserPhotoResponse(
        UUID id,
        UUID submissionId,
        UUID eventId,
        UUID albumId,
        String title,
        String caption,
        String altText,
        String format,
        int widthPx,
        int heightPx,
        long sizeBytes,
        Instant takenAt,
        String status,
        Instant createdAt,
        Instant updatedAt) {

    public static UserPhotoResponse from(Photo photo) {
        return new UserPhotoResponse(
                photo.getId(),
                photo.getSubmission() == null ? null : photo.getSubmission().getId(),
                photo.getEvent().getId(),
                photo.getAlbum() == null ? null : photo.getAlbum().getId(),
                photo.getTitle(),
                photo.getCaption(),
                photo.getAltText(),
                photo.getFormat(),
                photo.getWidthPx(),
                photo.getHeightPx(),
                photo.getSizeBytes(),
                photo.getTakenAt(),
                photo.getStatus().name(),
                photo.getCreatedAt(),
                photo.getUpdatedAt());
    }
}
