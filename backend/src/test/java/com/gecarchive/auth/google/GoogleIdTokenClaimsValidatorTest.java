package com.gecarchive.auth.google;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleIdTokenClaimsValidatorTest {

    private static final String CLIENT_ID = "1234-example.apps.googleusercontent.com";

    private final GoogleIdTokenClaimsValidator validator = new GoogleIdTokenClaimsValidator(CLIENT_ID);

    @Test
    void acceptsAnIdTokenIssuedForThisArchive() {
        assertThat(validator.validate(token().build()).hasErrors()).isFalse();
    }

    @Test
    void acceptsTheIssuerSpellingWithoutScheme() {
        OAuth2TokenValidatorResult result = validator.validate(
                token().claim("iss", "accounts.google.com").build());

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void rejectsATokenIssuedForAnotherApplication() {
        OAuth2TokenValidatorResult result = validator.validate(
                token().audience(List.of("some-other-client.apps.googleusercontent.com")).build());

        assertThat(codes(result)).containsExactly("invalid_audience");
    }

    @Test
    void rejectsATokenFromAnotherIssuer() {
        OAuth2TokenValidatorResult result = validator.validate(
                token().claim("iss", "https://evil.example").build());

        assertThat(codes(result)).containsExactly("invalid_issuer");
    }

    @Test
    void rejectsAnUnverifiedEmail() {
        OAuth2TokenValidatorResult result = validator.validate(
                token().claim("email_verified", false).build());

        assertThat(codes(result)).containsExactly("unverified_email");
    }

    @Test
    void rejectsAStringUnverifiedEmail() {
        OAuth2TokenValidatorResult result = validator.validate(
                token().claim("email_verified", "false").build());

        assertThat(codes(result)).containsExactly("unverified_email");
    }

    @Test
    void acceptsAStringVerifiedEmail() {
        OAuth2TokenValidatorResult result = validator.validate(
                token().claim("email_verified", "true").build());

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void rejectsATokenWithoutEmailOrSubject() {
        OAuth2TokenValidatorResult result = validator.validate(
                token()
                        .claim("email", " ")
                        .subject(" ")
                        .build());

        assertThat(codes(result)).containsExactlyInAnyOrder("missing_email", "missing_subject");
    }

    private static List<String> codes(OAuth2TokenValidatorResult result) {
        return result.getErrors().stream().map(OAuth2Error::getErrorCode).toList();
    }

    private static Jwt.Builder token() {
        return Jwt.withTokenValue("id-token")
                .header("alg", "RS256")
                .subject("google-subject-1")
                .issuedAt(Instant.now().minusSeconds(30))
                .expiresAt(Instant.now().plusSeconds(300))
                .claim("iss", "https://accounts.google.com")
                .audience(List.of(CLIENT_ID))
                .claim("email", "asha.verma@example.edu")
                .claim("email_verified", true);
    }
}
