package com.gecarchive.photo.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.upload.dto.PhotographerCreditResponse;

/**
 * The uploader's own view of a photograph.
 *
 * <p>No delivery URL is exposed: pending and rejected assets must stay
 * unreachable through public image URLs. Credits are included so the uploader
 * can confirm the recorded attribution before moderation.</p>
 */
public record UserPhotoResponse(
        UUID id,
        UUID submissionId,
        UUID eventId,
        String eventTitle,
        UUID albumId,
        String albumTitle,
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
        Instant updatedAt,
        List<PhotographerCreditResponse> photographers) {

    public UserPhotoResponse {
        photographers = List.copyOf(photographers);
    }

    public static UserPhotoResponse from(Photo photo, List<PhotoPhotographer> credits) {
        return new UserPhotoResponse(
                photo.getId(),
                photo.getSubmission() == null ? null : photo.getSubmission().getId(),
                photo.getEvent().getId(),
                photo.getEvent().getTitle(),
                photo.getAlbum() == null ? null : photo.getAlbum().getId(),
                photo.getAlbum() == null ? null : photo.getAlbum().getTitle(),
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
                photo.getUpdatedAt(),
                credits.stream().map(PhotographerCreditResponse::from).toList());
    }
}
