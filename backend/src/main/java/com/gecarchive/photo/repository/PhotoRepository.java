package com.gecarchive.photo.repository;

import java.util.Optional;
import java.util.UUID;

import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {

    Page<Photo> findByAlbum_IdAndStatusAndDeletedAtIsNull(
            UUID albumId, PhotoStatus status, Pageable pageable);

    Page<Photo> findByEvent_IdAndStatusAndDeletedAtIsNull(
            UUID eventId, PhotoStatus status, Pageable pageable);

    Page<Photo> findByUploadedBy_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
            select photo
            from Photo photo
            join photo.album album
            join album.event event
            where album.id = :albumId
              and photo.status = com.gecarchive.photo.entity.PhotoStatus.APPROVED
              and photo.deletedAt is null
              and album.published = true
              and album.deletedAt is null
              and event.published = true
              and event.deletedAt is null
            """)
    Page<Photo> findPublicByAlbumId(@Param("albumId") UUID albumId, Pageable pageable);

    @Query("""
            select photo
            from Photo photo
            join photo.album album
            join album.event event
            where photo.event.id = :eventId
              and photo.status = com.gecarchive.photo.entity.PhotoStatus.APPROVED
              and photo.deletedAt is null
              and album.published = true
              and album.deletedAt is null
              and event.published = true
              and event.deletedAt is null
            """)
    Page<Photo> findPublicByEventId(@Param("eventId") UUID eventId, Pageable pageable);

    @Query("""
            select photo
            from Photo photo
            join photo.album album
            join album.event event
            where photo.id = :photoId
              and photo.status = com.gecarchive.photo.entity.PhotoStatus.APPROVED
              and photo.deletedAt is null
              and album.published = true
              and album.deletedAt is null
              and event.published = true
              and event.deletedAt is null
            """)
    Optional<Photo> findPublicById(@Param("photoId") UUID photoId);
}
