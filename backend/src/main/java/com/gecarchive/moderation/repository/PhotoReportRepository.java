package com.gecarchive.moderation.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoReport;
import com.gecarchive.moderation.entity.ReportStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PhotoReportRepository extends JpaRepository<PhotoReport, UUID> {

    Page<PhotoReport> findByStatusOrderByCreatedAtAsc(ReportStatus status, Pageable pageable);

    Page<PhotoReport> findAllByOrderByCreatedAtAsc(Pageable pageable);

    Page<PhotoReport> findByPhoto_IdOrderByCreatedAtDesc(UUID photoId, Pageable pageable);

    boolean existsByPhoto_IdAndReportedBy_IdAndStatusIn(
            UUID photoId, UUID reportedById, Collection<ReportStatus> statuses);

    @Query("select report.status, count(report) from PhotoReport report group by report.status")
    List<Object[]> countGroupedByStatus();
}
