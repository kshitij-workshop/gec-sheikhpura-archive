package com.gecarchive.moderation.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoRemovalRequest;
import com.gecarchive.moderation.entity.RemovalRequestStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface PhotoRemovalRequestRepository
        extends JpaRepository<PhotoRemovalRequest, UUID>, JpaSpecificationExecutor<PhotoRemovalRequest> {

    Page<PhotoRemovalRequest> findByStatusOrderByCreatedAtAsc(
            RemovalRequestStatus status, Pageable pageable);

    Page<PhotoRemovalRequest> findAllByOrderByCreatedAtAsc(Pageable pageable);

    Optional<PhotoRemovalRequest> findByPhoto_IdAndRequestedBy_IdAndStatus(
            UUID photoId, UUID requestedById, RemovalRequestStatus status);

    /**
     * Loads the photograph context needed by the governance queue in the same
     * query so a page of requests never fans out into per-row lazy loads.
     */
    @Override
    @EntityGraph(attributePaths = {"photo", "photo.event", "photo.album", "photo.uploadedBy"})
    Page<PhotoRemovalRequest> findAll(Specification<PhotoRemovalRequest> spec, Pageable pageable);

    @Query("select request.status, count(request) from PhotoRemovalRequest request group by request.status")
    List<Object[]> countGroupedByStatus();
}
