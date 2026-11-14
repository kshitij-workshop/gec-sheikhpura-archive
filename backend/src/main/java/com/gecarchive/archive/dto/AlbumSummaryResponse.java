package com.gecarchive.archive.dto;

import java.util.UUID;

import com.gecarchive.album.entity.Album;

public record AlbumSummaryResponse(UUID id, String title, String slug, String description, int sortOrder) {

    public static AlbumSummaryResponse from(Album album) {
        return new AlbumSummaryResponse(album.getId(), album.getTitle(), album.getSlug(),
                album.getDescription(), album.getSortOrder());
    }
}
