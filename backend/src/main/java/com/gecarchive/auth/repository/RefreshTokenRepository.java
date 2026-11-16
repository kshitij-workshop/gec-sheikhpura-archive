package com.gecarchive.auth.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gecarchive.auth.entity.RefreshToken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByFamilyId(UUID familyId);

    List<RefreshToken> findByUser_Id(UUID userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update RefreshToken token
            set token.revokedAt = :now,
                token.revocationReason = :reason
            where token.familyId = :familyId
              and token.revokedAt is null
            """)
    int revokeFamily(
            @Param("familyId") UUID familyId,
            @Param("now") Instant now,
            @Param("reason") String reason);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update RefreshToken token
            set token.revokedAt = :now,
                token.revocationReason = :reason
            where token.user.id = :userId
              and token.revokedAt is null
            """)
    int revokeAllForUser(
            @Param("userId") UUID userId,
            @Param("now") Instant now,
            @Param("reason") String reason);

    /**
     * Approximate count of signed-in accounts. Refresh tokens rotate on every
     * refresh, so the newest non-revoked token's issue time tracks recent
     * activity without writing to the user row on every request.
     */
    @Query("""
            select count(distinct token.user.id)
            from RefreshToken token
            where token.revokedAt is null
              and token.issuedAt >= :since
            """)
    long countUsersActiveSince(@Param("since") Instant since);
}
