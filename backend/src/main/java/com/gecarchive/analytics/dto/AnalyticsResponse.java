package com.gecarchive.analytics.dto;

import java.util.Map;

/**
 * Aggregated operational counters for the administrator dashboard.
 *
 * <p>Every status map contains an entry for each known enum constant so the
 * client can render a stable table without null handling.</p>
 */
public record AnalyticsResponse(
        Map<String, Long> photosByStatus,
        Map<String, Long> submissionsByStatus,
        Map<String, Long> reportsByStatus,
        Map<String, Long> removalRequestsByStatus,
        Map<String, Long> suggestionsByStatus,
        Map<String, Long> usersByStatus,
        Map<String, Long> usersByRole,
        long events,
        long publishedEvents,
        long albums,
        long publishedAlbums,
        long academicYears,
        long categories,
        long activeCategories,
        long contributors) {
}
