package com.gecarchive.upload.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.photo.entity.PhotoSubmission;

/**
 * The submitter's view of a submission batch.
 *
 * <p>Titles are denormalised here so tracking views never have to resolve
 * identifiers against public endpoints, which would also fail for events and
 * albums that are not published yet.</p>
 */
public record SubmissionResponse(
        UUID id,
        UUID eventId,
        String eventTitle,
        UUID albumId,
        String albumTitle,
        String status,
        String note,
        Instant createdAt,
        Instant updatedAt) {

    public static SubmissionResponse from(PhotoSubmission submission) {
        return new SubmissionResponse(
                submission.getId(),
                submission.getEvent().getId(),
                submission.getEvent().getTitle(),
                submission.getAlbum() == null ? null : submission.getAlbum().getId(),
                submission.getAlbum() == null ? null : submission.getAlbum().getTitle(),
                submission.getStatus().name(),
                submission.getNote(),
                submission.getCreatedAt(),
                submission.getUpdatedAt());
    }
}
