package com.gecarchive.auth.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.gecarchive.auth.entity.AuthToken;
import com.gecarchive.auth.entity.AuthTokenPurpose;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {

    Optional<AuthToken> findByTokenHash(String tokenHash);

    @Modifying(flushAutomatically = true)
    @Query("""
            update AuthToken token
            set token.usedAt = :now
            where token.user.id = :userId
              and token.purpose = :purpose
              and token.usedAt is null
            """)
    int invalidateActive(
            @Param("userId") UUID userId,
            @Param("purpose") AuthTokenPurpose purpose,
            @Param("now") Instant now);
}
