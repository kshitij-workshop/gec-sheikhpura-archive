package com.gecarchive.upload.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.photo.entity.PhotoSubmission;

public record SubmissionResponse(
        UUID id,
        UUID eventId,
        UUID albumId,
        String status,
        String note,
        Instant createdAt,
        Instant updatedAt) {

    public static SubmissionResponse from(PhotoSubmission submission) {
        return new SubmissionResponse(submission.getId(), submission.getEvent().getId(),
                submission.getAlbum() == null ? null : submission.getAlbum().getId(),
                submission.getStatus().name(), submission.getNote(), submission.getCreatedAt(), submission.getUpdatedAt());
    }
}
