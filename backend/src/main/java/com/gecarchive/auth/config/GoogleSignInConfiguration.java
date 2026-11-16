package com.gecarchive.auth.config;

import com.gecarchive.auth.google.GoogleIdTokenClaimsValidator;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Wires verification of Google Identity Services ID tokens.
 *
 * <p>Google rotates its signing keys, so the decoder fetches Google's JWKS on
 * first use. The bean is created even when no client ID is configured, which
 * keeps the application startable without Google credentials; the verifier then
 * answers {@code 503} instead of accepting tokens.</p>
 */
@Configuration
@EnableConfigurationProperties(GoogleSignInProperties.class)
public class GoogleSignInConfiguration {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";

    @Bean("googleIdTokenDecoder")
    JwtDecoder googleIdTokenDecoder(GoogleSignInProperties properties) {
        if (!properties.configured()) {
            return token -> {
                throw new JwtException("Google sign-in is not configured.");
            };
        }

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<Jwt>(
                JwtValidators.createDefault(),
                new GoogleIdTokenClaimsValidator(properties.clientId())));
        return decoder;
    }
}
