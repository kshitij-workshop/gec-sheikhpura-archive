package com.gecarchive.auth.google;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Enforces the ID-token claims that a valid signature alone cannot prove.
 *
 * <p>The decoder already validates the signature, {@code exp} and {@code nbf}.
 * This validator adds the audience check (the token must have been issued for
 * this archive), accepts both Google issuer spellings, and refuses tokens for
 * unverified or missing email addresses.</p>
 */
public class GoogleIdTokenClaimsValidator implements OAuth2TokenValidator<Jwt> {

    /** Google emits the issuer with and without the scheme. */
    static final Set<String> ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    private static final OAuth2Error INVALID_ISSUER = error(
            "invalid_issuer", "The ID token was not issued by Google.");
    private static final OAuth2Error INVALID_AUDIENCE = error(
            "invalid_audience", "The ID token was not issued for this archive.");
    private static final OAuth2Error UNVERIFIED_EMAIL = error(
            "unverified_email", "The Google account has no verified email address.");
    private static final OAuth2Error MISSING_EMAIL = error(
            "missing_email", "The ID token does not contain an email address.");
    private static final OAuth2Error MISSING_SUBJECT = error(
            "missing_subject", "The ID token does not contain an account identifier.");

    private final String clientId;

    public GoogleIdTokenClaimsValidator(String clientId) {
        this.clientId = clientId;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        List<OAuth2Error> errors = new ArrayList<>(3);

        String issuer = token.getClaimAsString("iss");
        if (issuer == null || !ISSUERS.contains(issuer)) {
            errors.add(INVALID_ISSUER);
        }

        List<String> audience = token.getAudience();
        if (audience == null || !audience.contains(clientId)) {
            errors.add(INVALID_AUDIENCE);
        }

        if (!isTrue(token.getClaims().get("email_verified"))) {
            errors.add(UNVERIFIED_EMAIL);
        }

        if (isBlank(token.getClaimAsString("email"))) {
            errors.add(MISSING_EMAIL);
        }

        if (isBlank(token.getSubject())) {
            errors.add(MISSING_SUBJECT);
        }

        return errors.isEmpty()
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(errors);
    }

    /** Google sends a JSON boolean, but tolerate the string form as well. */
    private static boolean isTrue(Object claim) {
        if (claim instanceof Boolean value) {
            return value;
        }
        return claim instanceof String value && "true".equalsIgnoreCase(value);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static OAuth2Error error(String code, String description) {
        return new OAuth2Error(code, description, null);
    }
}
