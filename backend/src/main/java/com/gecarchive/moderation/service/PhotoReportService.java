package com.gecarchive.moderation.service;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.moderation.dto.ReportRequest;
import com.gecarchive.moderation.dto.ReportResolutionRequest;
import com.gecarchive.moderation.dto.ReportResponse;
import com.gecarchive.moderation.entity.PhotoReport;
import com.gecarchive.moderation.entity.ReportStatus;
import com.gecarchive.moderation.repository.PhotoReportRepository;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PhotoReportService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<ReportStatus> OPEN = Set.of(ReportStatus.PENDING, ReportStatus.UNDER_REVIEW);
    private static final Set<ReportStatus> HANDLED = Set.of(ReportStatus.RESOLVED, ReportStatus.DISMISSED);

    private final PhotoRepository photos;
    private final PhotoReportRepository reports;
    private final UserRepository users;
    private final AuditService audit;

    public PhotoReportService(PhotoRepository photos, PhotoReportRepository reports, UserRepository users,
            AuditService audit) {
        this.photos = photos;
        this.reports = reports;
        this.users = users;
        this.audit = audit;
    }

    /**
     * Files a user report against a publicly visible photograph.
     *
     * <p>The public-visibility predicate is deliberate: pending and private
     * submissions cannot be discovered or probed through this endpoint.</p>
     */
    @Transactional
    public ReportResponse report(UUID photoId, ReportRequest request, AuthenticatedUser actor, ClientInfo client) {
        Photo photo = photos.findPublicById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photograph not found."));
        if (reports.existsByPhoto_IdAndReportedBy_IdAndStatusIn(photoId, actor.id(), OPEN)) {
            throw new ConflictException("You already have an open report for this photograph.");
        }

        User reporter = user(actor.id());
        PhotoReport report = new PhotoReport();
        report.setPhoto(photo);
        report.setReportedBy(reporter);
        report.setCategory(request.category());
        report.setDetails(blankToNull(request.details()));
        report.setStatus(ReportStatus.PENDING);
        reports.save(report);

        audit.record(reporter, "PHOTO_REPORTED", "PHOTO", photoId, null,
                Map.of("reportId", report.getId().toString(), "category", request.category().name()), client);
        return ReportResponse.from(report);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReportResponse> list(ReportStatus status, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), bounded(size),
                Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<PhotoReport> result = status == null
                ? reports.findAllByOrderByCreatedAtAsc(pageable)
                : reports.findByStatusOrderByCreatedAtAsc(status, pageable);
        return PageResponse.from(result, ReportResponse::from);
    }

    @Transactional
    public ReportResponse resolve(UUID id, ReportResolutionRequest request, AuthenticatedUser actor,
            ClientInfo client) {
        PhotoReport report = reports.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found."));
        if (HANDLED.contains(report.getStatus())) {
            throw new ConflictException("This report has already been handled.");
        }
        ReportStatus target = request.status();
        if (target == ReportStatus.PENDING) {
            throw new BadRequestException(
                    "A report must move to UNDER_REVIEW, RESOLVED or DISMISSED.");
        }
        String note = blankToNull(request.resolutionNote());
        if (target != ReportStatus.UNDER_REVIEW && note == null) {
            throw new BadRequestException("A resolution note is required.");
        }

        ReportStatus from = report.getStatus();
        report.setStatus(target);
        report.setResolutionNote(note);
        if (target == ReportStatus.RESOLVED || target == ReportStatus.DISMISSED) {
            report.setHandledBy(user(actor.id()));
            report.setHandledAt(Instant.now());
        }
        reports.save(report);

        audit.record(user(actor.id()), auditAction(target), "PHOTO_REPORT", report.getId(),
                Map.of("status", from.name()), Map.of("status", target.name()), client);
        return ReportResponse.from(report);
    }

    private String auditAction(ReportStatus status) {
        return switch (status) {
            case UNDER_REVIEW -> "PHOTO_REPORT_UNDER_REVIEW";
            case RESOLVED -> "PHOTO_REPORT_RESOLVED";
            case DISMISSED -> "PHOTO_REPORT_DISMISSED";
            default -> "PHOTO_REPORT_UPDATED";
        };
    }

    private User user(UUID id) {
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private int bounded(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }
}
