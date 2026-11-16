package com.gecarchive.analytics.dto;

import java.time.Instant;

/**
 * Public, aggregate-only archive activity. It deliberately contains no
 * identifiers: only counts that a visitor could already observe.
 */
public record PublicStatsResponse(
        long totalVisitors,
        long visitorsToday,
        long registeredUsers,
        long activeUsers,
        Instant generatedAt) {
}
