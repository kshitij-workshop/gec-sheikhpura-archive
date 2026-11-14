package com.gecarchive.upload.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateSubmissionRequest(
        @NotNull UUID eventId,
        UUID albumId,
        @Size(max = 2000) String note) {
}
