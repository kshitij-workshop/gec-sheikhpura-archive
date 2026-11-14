package com.gecarchive.moderation.repository;

import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoReport;
import com.gecarchive.moderation.entity.ReportStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoReportRepository extends JpaRepository<PhotoReport, UUID> {

    Page<PhotoReport> findByStatusOrderByCreatedAtAsc(ReportStatus status, Pageable pageable);

    Page<PhotoReport> findByPhoto_IdOrderByCreatedAtDesc(UUID photoId, Pageable pageable);
}
