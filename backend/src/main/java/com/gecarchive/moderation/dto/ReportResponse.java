package com.gecarchive.moderation.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoReport;

public record ReportResponse(
        UUID id,
        UUID photoId,
        UUID reportedByUserId,
        String category,
        String details,
        String status,
        String resolutionNote,
        UUID handledByUserId,
        Instant handledAt,
        Instant createdAt) {

    public static ReportResponse from(PhotoReport report) {
        return new ReportResponse(
                report.getId(),
                report.getPhoto().getId(),
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
