package com.gecarchive.archive.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;

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
        int sortOrder,
        List<PublicPhotographerCredit> photographers,
        boolean viewerCanRequestRemoval) {

    public PublicPhotoResponse {
        photographers = List.copyOf(photographers);
    }

    public static PublicPhotoResponse from(Photo photo, List<PhotoPhotographer> credits) {
        return from(photo, credits, null);
    }

    public static PublicPhotoResponse from(Photo photo, List<PhotoPhotographer> credits, UUID viewerId) {
        return new PublicPhotoResponse(photo.getId(), photo.getTitle(), photo.getCaption(), photo.getAltText(),
                photo.getCloudinaryPublicId(), photo.getFormat(), photo.getWidthPx(), photo.getHeightPx(),
                photo.getTakenAt(), photo.getSortOrder(),
                credits.stream().map(PublicPhotographerCredit::from).toList(),
                viewerId != null && viewerId.equals(photo.getUploadedBy().getId()));
    }
}
