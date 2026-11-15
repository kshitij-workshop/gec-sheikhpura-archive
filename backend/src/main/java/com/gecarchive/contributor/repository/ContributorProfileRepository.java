package com.gecarchive.contributor.repository;

import java.util.Optional;
import java.util.UUID;

import com.gecarchive.contributor.entity.ContributorProfile;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContributorProfileRepository extends JpaRepository<ContributorProfile, UUID> {

    Optional<ContributorProfile> findByUser_Id(UUID userId);

    boolean existsBySlug(String slug);

    Page<ContributorProfile> findByPublishedTrueAndDeletedAtIsNull(Pageable pageable);

    long countByPublishedTrueAndDeletedAtIsNull();
}
