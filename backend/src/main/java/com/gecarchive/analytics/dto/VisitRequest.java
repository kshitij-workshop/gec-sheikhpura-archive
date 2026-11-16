package com.gecarchive.analytics.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/**
 * @param visitorId random identifier generated in the browser; it must never be
 *                  derived from the IP address, the user agent, or an account
 */
public record VisitRequest(@NotNull UUID visitorId) {
}
