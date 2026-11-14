package com.gecarchive.moderation.repository;

import java.util.Optional;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoRemovalRequest;
import com.gecarchive.moderation.entity.RemovalRequestStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRemovalRequestRepository extends JpaRepository<PhotoRemovalRequest, UUID> {

    Page<PhotoRemovalRequest> findByStatusOrderByCreatedAtAsc(
            RemovalRequestStatus status, Pageable pageable);

    Optional<PhotoRemovalRequest> findByPhoto_IdAndRequestedBy_IdAndStatus(
            UUID photoId, UUID requestedById, RemovalRequestStatus status);
}
