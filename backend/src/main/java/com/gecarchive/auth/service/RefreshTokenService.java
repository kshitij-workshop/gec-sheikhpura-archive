package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.auth.entity.RefreshToken;
import com.gecarchive.auth.repository.RefreshTokenRepository;
import com.gecarchive.common.error.UnauthorizedException;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

    private static final String ROTATED = "ROTATED";
    private static final String LOGOUT = "LOGOUT";
    private static final String REUSE_DETECTED = "REUSE_DETECTED";
    private static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
    private static final String ROLE_CHANGED = "ROLE_CHANGED";
    private static final String ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE";

    private final RefreshTokenRepository repository;
    private final RefreshTokenRevocationService revocationService;
    private final AuthProperties properties;

    public RefreshTokenService(
            RefreshTokenRepository repository,
            RefreshTokenRevocationService revocationService,
            AuthProperties properties) {
        this.repository = repository;
        this.revocationService = revocationService;
        this.properties = properties;
    }

    @Transactional
    public IssuedRefreshToken issue(User user) {
        Instant now = Instant.now();
        UUID familyId = UUID.randomUUID();
        Instant familyExpiresAt = now.plus(properties.refreshToken().absoluteTtl());
        return create(user, familyId, familyExpiresAt, now);
    }

    @Transactional
    public RotatedRefreshToken rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new UnauthorizedException();
        }

        Instant now = Instant.now();
        RefreshToken current = repository.findByTokenHash(TokenHasher.sha256Hex(rawToken))
                .orElseThrow(UnauthorizedException::new);

        if (current.getRevokedAt() != null) {
            if (ROTATED.equals(current.getRevocationReason())) {
                revocationService.revokeFamily(current.getFamilyId(), REUSE_DETECTED);
            }
            throw new UnauthorizedException();
        }

        if (!current.getExpiresAt().isAfter(now) || !current.getFamilyExpiresAt().isAfter(now)) {
            throw new UnauthorizedException();
        }

        User user = current.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            revocationService.revokeFamily(current.getFamilyId(), ACCOUNT_INACTIVE);
            throw new UnauthorizedException();
        }

        current.setRevokedAt(now);
        current.setRevocationReason(ROTATED);
        repository.save(current);

        IssuedRefreshToken issued = create(user, current.getFamilyId(), current.getFamilyExpiresAt(), now);
        return new RotatedRefreshToken(user, issued.rawToken(), issued.expiresAt());
    }

    @Transactional
    public void revokeByRawToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHash(TokenHasher.sha256Hex(rawToken))
                .ifPresent(token -> revocationService.revokeFamily(token.getFamilyId(), LOGOUT));
    }

    @Transactional
    public void revokeAllForUser(UUID userId, String reason) {
        revocationService.revokeAllForUser(userId, reason);
    }

    @Transactional
    public void revokeAllAfterPasswordChange(UUID userId) {
        revokeAllForUser(userId, PASSWORD_CHANGED);
    }

    @Transactional
    public void revokeAllAfterRoleChange(UUID userId) {
        revokeAllForUser(userId, ROLE_CHANGED);
    }

    private IssuedRefreshToken create(User user, UUID familyId, Instant familyExpiresAt, Instant now) {
        Instant idleExpiry = now.plus(properties.refreshToken().idleTtl());
        Instant expiresAt = idleExpiry.isBefore(familyExpiresAt) ? idleExpiry : familyExpiresAt;
        if (!expiresAt.isAfter(now)) {
            throw new UnauthorizedException();
        }

        String rawToken = TokenHasher.generateOpaqueToken();
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setFamilyId(familyId);
        token.setTokenHash(TokenHasher.sha256Hex(rawToken));
        token.setIssuedAt(now);
        token.setExpiresAt(expiresAt);
        token.setFamilyExpiresAt(familyExpiresAt);
        repository.save(token);

        return new IssuedRefreshToken(rawToken, expiresAt);
    }

    public record IssuedRefreshToken(String rawToken, Instant expiresAt) {
    }

    public record RotatedRefreshToken(User user, String rawToken, Instant expiresAt) {
    }
}
