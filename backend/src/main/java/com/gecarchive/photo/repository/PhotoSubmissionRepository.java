package com.gecarchive.photo.repository;

import java.util.List;
import java.util.UUID;

import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.photo.entity.SubmissionStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PhotoSubmissionRepository extends JpaRepository<PhotoSubmission, UUID> {

    @EntityGraph(attributePaths = {"event", "album"})
    Page<PhotoSubmission> findBySubmittedBy_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<PhotoSubmission> findByStatusOrderByCreatedAtAsc(SubmissionStatus status, Pageable pageable);

    @Query("select submission.status, count(submission) from PhotoSubmission submission group by submission.status")
    List<Object[]> countGroupedByStatus();
}
