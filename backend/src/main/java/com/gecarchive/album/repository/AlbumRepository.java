package com.gecarchive.album.repository;

import java.util.List;
import java.util.UUID;

import com.gecarchive.album.entity.Album;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AlbumRepository extends JpaRepository<Album, UUID> {

    List<Album> findByEvent_IdAndPublishedTrueAndDeletedAtIsNullOrderBySortOrderAsc(UUID eventId);
}
