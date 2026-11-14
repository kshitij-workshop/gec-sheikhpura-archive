package com.gecarchive.event.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EventSuggestionRequest(
        @NotBlank @Size(max = 160) String title,
        @Size(max = 10000) String description,
        LocalDate approximateDate,
        UUID categoryId,
        UUID academicYearId) {
}
