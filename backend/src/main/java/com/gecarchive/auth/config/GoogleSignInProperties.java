package com.gecarchive.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Public OAuth client configuration for Google Identity Services.
 *
 * <p>Only the client ID is required. The browser obtains an ID token from
 * Google and the backend verifies it against Google's JWKS, so no client secret
 * exists for this application. Leaving the client ID empty keeps the feature
 * inert: the frontend hides the button and the API answers {@code 503}.</p>
 */
@ConfigurationProperties(prefix = "app.google")
public record GoogleSignInProperties(String clientId) {

    public boolean configured() {
        return clientId != null && !clientId.isBlank();
    }
}
