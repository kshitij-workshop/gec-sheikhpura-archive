package com.gecarchive.auth.google;

/**
 * Verifies a Google Identity Services ID token.
 *
 * <p>Implementations must validate the signature, the issuer, the audience, the
 * lifetime, and the {@code email_verified} claim before returning an identity.
 * Failures are reported as {@link com.gecarchive.common.error.UnauthorizedException}
 * so callers never learn which check failed.</p>
 */
public interface GoogleIdentityVerifier {

    GoogleIdentity verify(String idToken);
}
