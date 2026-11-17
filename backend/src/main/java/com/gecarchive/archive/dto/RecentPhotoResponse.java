package com.gecarchive.archive.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;

/**
 * A published photograph with enough album and event context to link back to
 * the album it belongs to. Used by the homepage feed; delivery URLs are still
 * built client-side from the public Cloudinary identifiers.
 */
public record RecentPhotoResponse(
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
        Instant approvedAt,
        UUID albumId,
        String albumTitle,
        String albumSlug,
        UUID eventId,
        String eventTitle,
        String eventSlug,
        List<PublicPhotographerCredit> photographers) {

    public RecentPhotoResponse {
        photographers = List.copyOf(photographers);
    }

    public static RecentPhotoResponse from(Photo photo, List<PhotoPhotographer> credits) {
        var album = photo.getAlbum();
        var event = photo.getEvent();
        return new RecentPhotoResponse(photo.getId(), photo.getTitle(), photo.getCaption(), photo.getAltText(),
                photo.getCloudinaryPublicId(), photo.getFormat(), photo.getWidthPx(), photo.getHeightPx(),
                photo.getTakenAt(), photo.getSortOrder(), photo.getApprovedAt(),
                album.getId(), album.getTitle(), album.getSlug(),
                event.getId(), event.getTitle(), event.getSlug(),
                credits.stream().map(PublicPhotographerCredit::from).toList());
    }
}
