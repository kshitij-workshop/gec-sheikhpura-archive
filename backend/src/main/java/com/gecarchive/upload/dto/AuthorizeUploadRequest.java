package com.gecarchive.upload.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record AuthorizeUploadRequest(@NotNull UUID submissionId) {
}
