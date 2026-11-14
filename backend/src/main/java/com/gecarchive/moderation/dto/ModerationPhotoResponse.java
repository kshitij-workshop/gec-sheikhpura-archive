package com.gecarchive.moderation.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.upload.dto.PhotographerCreditResponse;

public record ModerationPhotoResponse(
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
        UUID uploadedByUserId,
        String uploaderDisplayName,
        UUID approvedByUserId,
        Instant approvedAt,
        Instant createdAt,
        List<PhotographerCreditResponse> photographers) {

    public ModerationPhotoResponse {
        photographers = List.copyOf(photographers);
    }

    public static ModerationPhotoResponse from(Photo photo, List<PhotoPhotographer> credits) {
        return new ModerationPhotoResponse(
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
                photo.getUploadedBy().getId(),
                photo.getUploadedBy().getDisplayName(),
                photo.getApprovedBy() == null ? null : photo.getApprovedBy().getId(),
                photo.getApprovedAt(),
                photo.getCreatedAt(),
                credits.stream().map(PhotographerCreditResponse::from).toList());
    }
}
