package com.gecarchive.archive.dto;

import java.util.UUID;

import com.gecarchive.album.entity.Album;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.photo.entity.Photo;

public record AlbumDetailResponse(
        UUID id,
        String title,
        String slug,
        String description,
        EventResponse event,
        PageResponse<PublicPhotoResponse> photos) {

    public static AlbumDetailResponse from(Album album, EventResponse event, PageResponse<PublicPhotoResponse> photos) {
        return new AlbumDetailResponse(album.getId(), album.getTitle(), album.getSlug(), album.getDescription(),
                event, photos);
    }
}
