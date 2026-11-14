package com.gecarchive.upload.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

import com.gecarchive.upload.entity.UploadAuthorization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UploadAuthorizationRepository extends JpaRepository<UploadAuthorization, UUID> {

    Optional<UploadAuthorization> findByIdAndUser_Id(UUID id, UUID userId);

    long countBySubmission_Id(UUID submissionId);

    List<UploadAuthorization> findByExpiresAtBeforeAndUsedAtIsNull(Instant now);

    @Modifying
    @Query("delete from UploadAuthorization authorization where authorization.expiresAt < :now and authorization.usedAt is null")
    int deleteExpiredUnused(@Param("now") Instant now);
}
