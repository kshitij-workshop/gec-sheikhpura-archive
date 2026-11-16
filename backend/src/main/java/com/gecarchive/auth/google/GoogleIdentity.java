package com.gecarchive.auth.google;

/**
 * Claims from a Google ID token that the archive is willing to trust.
 *
 * <p>This record never carries the token, an access token, or a refresh token,
 * so it is safe to pass between services and to log indirectly through audit
 * records that store only booleans and identifiers.</p>
 *
 * @param subject   Google's stable account identifier ({@code sub})
 * @param email     normalized email address Google reports
 * @param displayName Google profile name, or {@code null} when absent
 */
public record GoogleIdentity(String subject, String email, String displayName) {
}
