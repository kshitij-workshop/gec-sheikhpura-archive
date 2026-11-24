package com.gecarchive.moderation.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoReport;

/**
 * A report as an administrator sees it.
 *
 * <p>{@code photo} carries the identifying context a moderator needs to judge
 * the report without leaving the queue. The member-facing creation response
 * deliberately omits it through {@link #created(PhotoReport)}.</p>
 */
public record ReportResponse(
        UUID id,
        UUID photoId,
        AdminPhotoSummary photo,
        UUID reportedByUserId,
        String category,
        String details,
        String status,
        String resolutionNote,
        UUID handledByUserId,
        Instant handledAt,
        Instant createdAt) {

    /** Administrative read model with identifying photograph context. */
    public static ReportResponse from(PhotoReport report) {
        return build(report, AdminPhotoSummary.from(report.getPhoto()));
    }

    /** The reporter's confirmation; it carries no administrative context. */
    public static ReportResponse created(PhotoReport report) {
        return build(report, null);
    }

    private static ReportResponse build(PhotoReport report, AdminPhotoSummary photo) {
        return new ReportResponse(
                report.getId(),
                report.getPhoto().getId(),
                photo,
                report.getReportedBy().getId(),
                report.getCategory().name(),
                report.getDetails(),
                report.getStatus().name(),
                report.getResolutionNote(),
                report.getHandledBy() == null ? null : report.getHandledBy().getId(),
                report.getHandledAt(),
                report.getCreatedAt());
    }
}
