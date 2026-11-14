package com.gecarchive.archive.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AcademicYearRequest(
        @NotBlank @Size(max = 40) String label,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate) {
}
