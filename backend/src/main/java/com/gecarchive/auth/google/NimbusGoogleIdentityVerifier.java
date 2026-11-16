package com.gecarchive.auth.google;

import com.gecarchive.auth.config.GoogleSignInProperties;
import com.gecarchive.common.error.ServiceUnavailableException;
import com.gecarchive.common.error.UnauthorizedException;
import com.gecarchive.common.text.Emails;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Verifies Google ID tokens against Google's published JWKS.
 *
 * <p>No client secret is involved: the browser obtains a short-lived ID token
 * with Google Identity Services and this class proves it came from Google and
 * was minted for this archive.</p>
 */
@Component
public class NimbusGoogleIdentityVerifier implements GoogleIdentityVerifier {

    private final GoogleSignInProperties properties;
    private final JwtDecoder decoder;

    public NimbusGoogleIdentityVerifier(
            GoogleSignInProperties properties,
            @Qualifier("googleIdTokenDecoder") JwtDecoder decoder) {
        this.properties = properties;
        this.decoder = decoder;
    }

    @Override
    public GoogleIdentity verify(String idToken) {
        if (!properties.configured()) {
            throw new ServiceUnavailableException(
                    "Google sign-in is not configured for this deployment.");
        }

        Jwt token;
        try {
            token = decoder.decode(idToken);
        } catch (JwtException | IllegalArgumentException exception) {
            // Never surface which check failed, and never log the token.
            throw new UnauthorizedException();
        }
        return toIdentity(token);
    }

    static GoogleIdentity toIdentity(Jwt token) {
        String name = token.getClaimAsString("name");
        String displayName = name == null || name.isBlank() ? null : name.trim();
        return new GoogleIdentity(
                token.getSubject(),
                Emails.normalize(token.getClaimAsString("email")),
                displayName);
    }
}
