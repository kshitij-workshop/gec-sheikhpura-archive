package com.gecarchive.auth.service;

import java.time.Duration;
import java.time.Instant;

import com.gecarchive.auth.entity.AuthToken;
import com.gecarchive.auth.entity.AuthTokenPurpose;
import com.gecarchive.auth.repository.AuthTokenRepository;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.user.entity.User;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthTokenService {

    private final AuthTokenRepository repository;

    public AuthTokenService(AuthTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public String issue(User user, AuthTokenPurpose purpose, Duration timeToLive) {
        Instant now = Instant.now();
        repository.invalidateActive(user.getId(), purpose, now);

        String rawToken = TokenHasher.generateOpaqueToken();
        AuthToken token = new AuthToken();
        token.setUser(user);
        token.setPurpose(purpose);
        token.setTokenHash(TokenHasher.sha256Hex(rawToken));
        token.setExpiresAt(now.plus(timeToLive));
        repository.save(token);
        return rawToken;
    }

    @Transactional
    public User consume(String rawToken, AuthTokenPurpose purpose) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("This link is invalid or has expired.");
        }

        AuthToken token = repository.findByTokenHash(TokenHasher.sha256Hex(rawToken))
                .orElseThrow(() -> new BadRequestException("This link is invalid or has expired."));

        Instant now = Instant.now();
        if (token.getPurpose() != purpose || !token.isUsable(now)) {
            throw new BadRequestException("This link is invalid or has expired.");
        }

        token.setUsedAt(now);
        repository.save(token);
        return token.getUser();
    }
}
