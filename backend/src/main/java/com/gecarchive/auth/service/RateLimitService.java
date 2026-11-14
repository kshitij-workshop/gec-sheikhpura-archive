package com.gecarchive.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import com.gecarchive.common.error.RateLimitExceededException;

import org.springframework.stereotype.Service;

/**
 * Fixed-window in-memory rate limiter.
 *
 * <p>This protects a single backend instance. A multi-instance deployment needs
 * a shared counter store; that limitation is documented in docs/SECURITY.md.</p>
 */
@Service
public class RateLimitService {

    private static final int MAX_TRACKED_KEYS = 50_000;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public void check(String key, int limit, Duration window) {
        Instant now = Instant.now();
        Window updated = windows.compute(key, (ignored, existing) -> {
            if (existing == null || !existing.startedAt().plus(window).isAfter(now)) {
                return new Window(now, 1);
            }
            return new Window(existing.startedAt(), existing.count() + 1);
        });

        if (updated.count() > limit) {
            long retryAfter = Math.max(1L, Duration.between(now, updated.startedAt().plus(window)).toSeconds());
            throw new RateLimitExceededException(retryAfter);
        }

        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.entrySet().removeIf(entry -> !entry.getValue().startedAt()
                    .plus(Duration.ofHours(1))
                    .isAfter(now));
        }
    }

    private record Window(Instant startedAt, int count) {
    }
}
