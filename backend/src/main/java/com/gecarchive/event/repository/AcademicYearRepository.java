package com.gecarchive.event.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gecarchive.event.entity.AcademicYear;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AcademicYearRepository extends JpaRepository<AcademicYear, UUID> {

    Optional<AcademicYear> findByLabel(String label);

    List<AcademicYear> findAllByOrderByStartDateDesc();

    boolean existsByLabelIgnoreCase(String label);
}
