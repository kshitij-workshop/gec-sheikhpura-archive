package com.gecarchive.archive.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;

public record PublicPhotoResponse(
        UUID id,
        String title,
        String caption,
        String altText,
        String cloudinaryPublicId,
        String format,
        int widthPx,
        int heightPx,
        Instant takenAt,
        int sortOrder) {

    public static PublicPhotoResponse from(Photo photo) {
        return new PublicPhotoResponse(photo.getId(), photo.getTitle(), photo.getCaption(), photo.getAltText(),
                photo.getCloudinaryPublicId(), photo.getFormat(), photo.getWidthPx(), photo.getHeightPx(),
                photo.getTakenAt(), photo.getSortOrder());
    }
}
