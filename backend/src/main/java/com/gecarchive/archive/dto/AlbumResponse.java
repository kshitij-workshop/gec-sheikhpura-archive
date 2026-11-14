package com.gecarchive.archive.dto;

import java.util.UUID;

import com.gecarchive.album.entity.Album;

public record AlbumResponse(
        UUID id,
        String title,
        String slug,
        String description,
        boolean published,
        int sortOrder,
        UUID eventId,
        String eventTitle,
        String eventSlug) {

    public static AlbumResponse from(Album album) {
        return new AlbumResponse(album.getId(), album.getTitle(), album.getSlug(), album.getDescription(),
                album.isPublished(), album.getSortOrder(), album.getEvent().getId(), album.getEvent().getTitle(),
                album.getEvent().getSlug());
    }
}
