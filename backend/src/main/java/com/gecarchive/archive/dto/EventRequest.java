package com.gecarchive.archive.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EventRequest(
        @NotNull UUID academicYearId,
        @NotNull UUID categoryId,
        @NotBlank @Size(max = 160) String title,
        @Size(max = 180) String slug,
        @Size(max = 10000) String description,
        @NotNull LocalDate eventDate,
        @Size(max = 160) String location,
        Boolean published,
        Boolean featured) {
}
