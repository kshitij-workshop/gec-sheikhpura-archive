package com.gecarchive.event.repository;

import java.util.Optional;
import java.util.UUID;

import com.gecarchive.event.entity.Event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

    Optional<Event> findBySlug(String slug);

    Optional<Event> findByIdAndPublishedTrueAndDeletedAtIsNull(UUID id);

    Optional<Event> findBySlugAndPublishedTrueAndDeletedAtIsNull(String slug);

    Page<Event> findByPublishedTrueAndDeletedAtIsNull(Pageable pageable);

    Page<Event> findByTitleContainingIgnoreCaseAndPublishedTrueAndDeletedAtIsNull(
            String title, Pageable pageable);

    long countByDeletedAtIsNull();

    long countByPublishedTrueAndDeletedAtIsNull();
}
