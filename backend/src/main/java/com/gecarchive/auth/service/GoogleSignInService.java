package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.Map;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.auth.dto.GoogleSignInRequest;
import com.gecarchive.auth.google.GoogleIdentity;
import com.gecarchive.auth.google.GoogleIdentityVerifier;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.UnauthorizedException;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.common.text.Emails;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Signs a person in with a Google-verified identity.
 *
 * <p>Linking rules, in order:</p>
 * <ol>
 *   <li>A known Google subject signs into the account it is bound to.</li>
 *   <li>Otherwise, an account with the same email is linked, because Google has
 *       already proven ownership of that mailbox.</li>
 *   <li>Otherwise a new {@code ACTIVE} account is created without a password.</li>
 * </ol>
 *
 * <p>Linking never changes a role, never reactivates a suspended account, and
 * never steals an address already bound to a different Google subject.</p>
 */
@Service
public class GoogleSignInService {

    private static final int MAX_DISPLAY_NAME = 120;

    private final UserRepository users;
    private final GoogleIdentityVerifier verifier;
    private final AuthenticationService authenticationService;
    private final AuditService auditService;
    private final RateLimitService rateLimitService;
    private final AuthProperties properties;

    public GoogleSignInService(
            UserRepository users,
            GoogleIdentityVerifier verifier,
            AuthenticationService authenticationService,
            AuditService auditService,
            RateLimitService rateLimitService,
            AuthProperties properties) {
        this.users = users;
        this.verifier = verifier;
        this.authenticationService = authenticationService;
        this.auditService = auditService;
        this.rateLimitService = rateLimitService;
        this.properties = properties;
    }

    @Transactional
    public AuthenticationService.Session signIn(GoogleSignInRequest request, ClientInfo client) {
        var limits = properties.rateLimit();
        rateLimitService.check(
                "google:ip:" + client.ipAddress(),
                limits.loginPerIp(),
                limits.loginWindow());

        GoogleIdentity identity = verifier.verify(request.idToken());
        rateLimitService.check(
                "google:subject:" + identity.subject(),
                limits.loginPerAccount(),
                limits.loginWindow());

        String email = Emails.normalize(identity.email());
        Outcome outcome = resolveAccount(identity, email);
        User user = outcome.user();

        requireUsableAccount(user);

        user.setLastLoginAt(Instant.now());
        users.save(user);

        auditService.record(
                user,
                "USER_SIGNED_IN_WITH_GOOGLE",
                "USER",
                user.getId(),
                null,
                Map.of(
                        "newAccount", outcome.created(),
                        "linkedExistingAccount", outcome.linked()),
                client);

        return authenticationService.issueSession(user);
    }

    private Outcome resolveAccount(GoogleIdentity identity, String email) {
        User bySubject = users.findByGoogleSubject(identity.subject()).orElse(null);
        if (bySubject != null) {
            return new Outcome(bySubject, false, false);
        }

        User byEmail = users.findByEmailIgnoreCase(email).orElse(null);
        if (byEmail == null) {
            return new Outcome(createAccount(identity, email), true, false);
        }

        if (byEmail.getGoogleSubject() != null) {
            // The address is already bound to a different Google account.
            throw new ConflictException(
                    "This email address is already connected to another Google account.");
        }

        requireLinkableAccount(byEmail);
        linkGoogleAccount(byEmail, identity);
        return new Outcome(byEmail, false, true);
    }

    private User createAccount(GoogleIdentity identity, String email) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName(identity, email));
        user.setRole(Role.USER);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        user.setGoogleSubject(identity.subject());
        return user;
    }

    /**
     * Google verified the mailbox, so this is equivalent to the person clicking
     * a verification link: mark the address verified and activate a pending
     * account.
     */
    private void linkGoogleAccount(User user, GoogleIdentity identity) {
        user.setGoogleSubject(identity.subject());
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(Instant.now());
        }
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            user.setStatus(UserStatus.ACTIVE);
        }
    }

    private void requireUsableAccount(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException();
        }
    }

    /**
     * A suspended or deactivated account must not be revived by proving
     * ownership of its email address, and must not be linked either.
     */
    private void requireLinkableAccount(User user) {
        if (user.getStatus() == UserStatus.SUSPENDED
                || user.getStatus() == UserStatus.DEACTIVATED) {
            throw new UnauthorizedException();
        }
    }

    private static String displayName(GoogleIdentity identity, String email) {
        String candidate = identity.displayName();
        if (candidate == null || candidate.isBlank()) {
            int at = email.indexOf('@');
            candidate = at > 0 ? email.substring(0, at) : email;
        }
        candidate = candidate.trim();
        return candidate.length() > MAX_DISPLAY_NAME
                ? candidate.substring(0, MAX_DISPLAY_NAME).trim()
                : candidate;
    }

    private record Outcome(User user, boolean created, boolean linked) {
    }
}
