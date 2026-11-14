package com.gecarchive.archive.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AlbumRequest(
        @NotNull UUID eventId,
        @NotBlank @Size(max = 160) String title,
        @Size(max = 180) String slug,
        @Size(max = 10000) String description,
        Boolean published,
        Integer sortOrder) {
}
