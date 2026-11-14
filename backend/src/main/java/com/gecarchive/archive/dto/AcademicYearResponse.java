package com.gecarchive.archive.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.event.entity.AcademicYear;

public record AcademicYearResponse(UUID id, String label, LocalDate startDate, LocalDate endDate) {

    public static AcademicYearResponse from(AcademicYear year) {
        return new AcademicYearResponse(year.getId(), year.getLabel(), year.getStartDate(), year.getEndDate());
    }
}
