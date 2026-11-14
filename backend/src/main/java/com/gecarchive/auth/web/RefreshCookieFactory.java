package com.gecarchive.auth.web;

import java.time.Duration;
import java.time.Instant;

import com.gecarchive.auth.config.AuthProperties;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshCookieFactory {

    private static final String COOKIE_PATH = "/api/v1/auth";

    private final AuthProperties properties;

    public RefreshCookieFactory(AuthProperties properties) {
        this.properties = properties;
    }

    public ResponseCookie create(String rawToken, Instant expiresAt) {
        long maxAgeSeconds = Math.max(0L, Duration.between(Instant.now(), expiresAt).toSeconds());
        return base(rawToken)
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build();
    }

    public ResponseCookie clear() {
        return base("")
                .maxAge(Duration.ZERO)
                .build();
    }

    public String cookieName() {
        return properties.refreshToken().cookieName();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(properties.refreshToken().cookieName(), value)
                .httpOnly(true)
                .secure(properties.refreshToken().cookieSecure())
                .sameSite("Lax")
                .path(COOKIE_PATH);
    }
}
