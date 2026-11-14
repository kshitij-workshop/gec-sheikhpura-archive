package com.gecarchive.upload.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterPhotoRequest(
        @NotNull UUID authorizationId,
        @NotBlank String publicId,
        @Size(max = 160) String title,
        @Size(max = 10000) String caption,
        @Size(max = 300) String altText,
        Instant takenAt,
        @NotEmpty @Size(max = 20) List<@Valid PhotographerCreditRequest> photographers) {
}
