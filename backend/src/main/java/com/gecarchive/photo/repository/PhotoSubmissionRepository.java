package com.gecarchive.photo.repository;

import java.util.UUID;

import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.photo.entity.SubmissionStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoSubmissionRepository extends JpaRepository<PhotoSubmission, UUID> {

    Page<PhotoSubmission> findBySubmittedBy_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<PhotoSubmission> findByStatusOrderByCreatedAtAsc(SubmissionStatus status, Pageable pageable);

}
