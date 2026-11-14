package com.gecarchive.upload.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;

public record PhotoResponse(
        UUID id,
        UUID submissionId,
        String title,
        String caption,
        String altText,
        String format,
        int widthPx,
        int heightPx,
        long sizeBytes,
        Instant takenAt,
        String status,
        List<PhotographerCreditResponse> photographers) {

    public static PhotoResponse from(Photo photo, List<PhotoPhotographer> credits) {
        return new PhotoResponse(photo.getId(), photo.getSubmission() == null ? null : photo.getSubmission().getId(),
                photo.getTitle(), photo.getCaption(), photo.getAltText(), photo.getFormat(), photo.getWidthPx(),
                photo.getHeightPx(), photo.getSizeBytes(), photo.getTakenAt(), photo.getStatus().name(),
                credits.stream().map(PhotographerCreditResponse::from).toList());
    }
}
