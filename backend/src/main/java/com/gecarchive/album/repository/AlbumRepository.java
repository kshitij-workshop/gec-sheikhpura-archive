package com.gecarchive.album.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gecarchive.album.entity.Album;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AlbumRepository extends JpaRepository<Album, UUID> {

    Optional<Album> findBySlug(String slug);

    List<Album> findByEvent_IdAndPublishedTrueAndDeletedAtIsNullOrderBySortOrderAsc(UUID eventId);

    Optional<Album> findByIdAndPublishedTrueAndDeletedAtIsNull(UUID id);

    Optional<Album> findBySlugAndPublishedTrueAndDeletedAtIsNull(String slug);

    List<Album> findByEvent_IdOrderBySortOrderAsc(UUID eventId);
}
