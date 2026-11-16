package com.gecarchive.auth.google;

import java.time.Instant;

import com.gecarchive.auth.config.GoogleSignInProperties;
import com.gecarchive.common.error.ServiceUnavailableException;
import com.gecarchive.common.error.UnauthorizedException;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NimbusGoogleIdentityVerifierTest {

    private static final GoogleSignInProperties CONFIGURED =
            new GoogleSignInProperties("1234-example.apps.googleusercontent.com");

    @Test
    void refusesToVerifyWhenTheDeploymentHasNoClientId() {
        NimbusGoogleIdentityVerifier verifier = new NimbusGoogleIdentityVerifier(
                new GoogleSignInProperties(""),
                token -> {
                    throw new AssertionError("the decoder must not be used");
                });

        assertThatThrownBy(() -> verifier.verify("id-token"))
                .isInstanceOf(ServiceUnavailableException.class);
    }

    @Test
    void mapsVerifiedClaimsAndKeepsNothingElse() {
        Jwt token = Jwt.withTokenValue("id-token")
                .header("alg", "RS256")
                .subject("google-subject-1")
                .claim("email", " Asha.Verma@Example.EDU ")
                .claim("name", "  Asha Verma  ")
                .issuedAt(Instant.now().minusSeconds(10))
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
        NimbusGoogleIdentityVerifier verifier = new NimbusGoogleIdentityVerifier(CONFIGURED, token(token));

        GoogleIdentity identity = verifier.verify("id-token");

        assertThat(identity.subject()).isEqualTo("google-subject-1");
        assertThat(identity.email()).isEqualTo("asha.verma@example.edu");
        assertThat(identity.displayName()).isEqualTo("Asha Verma");
    }

    @Test
    void leavesTheDisplayNameEmptyWhenGoogleDoesNotSendOne() {
        Jwt token = Jwt.withTokenValue("id-token")
                .header("alg", "RS256")
                .subject("google-subject-2")
                .claim("email", "student@example.edu")
                .issuedAt(Instant.now().minusSeconds(10))
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
        NimbusGoogleIdentityVerifier verifier = new NimbusGoogleIdentityVerifier(CONFIGURED, token(token));

        assertThat(verifier.verify("id-token").displayName()).isNull();
    }

    @Test
    void rejectsATokenTheDecoderRefuses() {
        JwtDecoder decoder = value -> {
            throw new JwtException("signature verification failed");
        };
        NimbusGoogleIdentityVerifier verifier = new NimbusGoogleIdentityVerifier(CONFIGURED, decoder);

        assertThatThrownBy(() -> verifier.verify("id-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageNotContaining("signature");
    }

    @Test
    void rejectsAMalformedToken() {
        JwtDecoder decoder = value -> {
            throw new IllegalArgumentException("token value cannot be empty");
        };
        NimbusGoogleIdentityVerifier verifier = new NimbusGoogleIdentityVerifier(CONFIGURED, decoder);

        assertThatThrownBy(() -> verifier.verify(""))
                .isInstanceOf(UnauthorizedException.class);
    }

    private static JwtDecoder token(Jwt token) {
        return value -> token;
    }
}
