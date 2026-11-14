package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.auth.repository.RefreshTokenRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Commits security revocations independently of the surrounding request.
 *
 * <p>Refresh-token reuse detection must revoke the family even though the
 * request itself fails with 401 and its transaction rolls back.</p>
 */
@Service
public class RefreshTokenRevocationService {

    private final RefreshTokenRepository repository;

    public RefreshTokenRevocationService(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamily(UUID familyId, String reason) {
        repository.revokeFamily(familyId, Instant.now(), reason);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllForUser(UUID userId, String reason) {
        repository.revokeAllForUser(userId, Instant.now(), reason);
    }
}
