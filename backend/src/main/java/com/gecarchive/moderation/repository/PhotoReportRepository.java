package com.gecarchive.moderation.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoReport;
import com.gecarchive.moderation.entity.ReportStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.domain.Specification;

public interface PhotoReportRepository
        extends JpaRepository<PhotoReport, UUID>, JpaSpecificationExecutor<PhotoReport> {

    Page<PhotoReport> findByStatusOrderByCreatedAtAsc(ReportStatus status, Pageable pageable);

    Page<PhotoReport> findAllByOrderByCreatedAtAsc(Pageable pageable);

    Page<PhotoReport> findByPhoto_IdOrderByCreatedAtDesc(UUID photoId, Pageable pageable);

    boolean existsByPhoto_IdAndReportedBy_IdAndStatusIn(
            UUID photoId, UUID reportedById, Collection<ReportStatus> statuses);

    /**
     * Loads the photograph context needed by the governance queue in the same
     * query so a page of reports never fans out into per-row lazy loads.
     */
    @Override
    @EntityGraph(attributePaths = {"photo", "photo.event", "photo.album", "photo.uploadedBy"})
    Page<PhotoReport> findAll(Specification<PhotoReport> spec, Pageable pageable);

    @Query("select report.status, count(report) from PhotoReport report group by report.status")
    List<Object[]> countGroupedByStatus();
}
