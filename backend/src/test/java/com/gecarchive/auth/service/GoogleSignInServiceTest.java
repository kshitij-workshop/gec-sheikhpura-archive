package com.gecarchive.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import com.gecarchive.audit.service.AuditService;
import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.auth.dto.GoogleSignInRequest;
import com.gecarchive.auth.google.GoogleIdentity;
import com.gecarchive.auth.google.GoogleIdentityVerifier;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.RateLimitExceededException;
import com.gecarchive.common.error.UnauthorizedException;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleSignInServiceTest {

    private static final String SUBJECT = "google-subject-1";
    private static final String EMAIL = "asha.verma@example.edu";
    private static final String ID_TOKEN = "id-token-value";

    @Mock
    private UserRepository users;

    @Mock
    private GoogleIdentityVerifier verifier;

    @Mock
    private AuthenticationService authenticationService;

    @Mock
    private AuditService auditService;

    @Mock
    private RateLimitService rateLimitService;

    private GoogleSignInService service;

    @BeforeEach
    void setUp() {
        service = new GoogleSignInService(
                users,
                verifier,
                authenticationService,
                auditService,
                rateLimitService,
                properties());
    }

    @Test
    void createsAnActivePasswordlessAccountForANewGoogleUser() {
        when(verifier.verify(ID_TOKEN)).thenReturn(identity("Asha Verma"));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.empty());
        when(authenticationService.issueSession(any(User.class))).thenAnswer(invocation ->
                session(invocation.getArgument(0)));

        service.signIn(request(), client());

        User saved = savedUser();
        assertThat(saved.getEmail()).isEqualTo(EMAIL);
        assertThat(saved.getDisplayName()).isEqualTo("Asha Verma");
        assertThat(saved.getRole()).isEqualTo(Role.USER);
        assertThat(saved.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(saved.getEmailVerifiedAt()).isNotNull();
        assertThat(saved.getGoogleSubject()).isEqualTo(SUBJECT);
        assertThat(saved.getPasswordHash()).isNull();
        assertThat(saved.getLastLoginAt()).isNotNull();
        verify(auditService).record(
                any(User.class),
                eq("USER_SIGNED_IN_WITH_GOOGLE"),
                eq("USER"),
                any(),
                isNull(),
                eq(Map.of("newAccount", true, "linkedExistingAccount", false)),
                eq(client()));
    }

    @Test
    void activatesAndLinksAnUnverifiedPasswordAccount() {
        User existing = user(UserStatus.PENDING_VERIFICATION)
                .withPasswordHash("$2a$12$stored-hash")
                .withRole(Role.ADMIN)
                .build();
        when(verifier.verify(ID_TOKEN)).thenReturn(identity("Asha Verma"));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(existing));
        when(authenticationService.issueSession(existing))
                .thenReturn(session(existing));

        service.signIn(request(), client());

        assertThat(existing.getGoogleSubject()).isEqualTo(SUBJECT);
        assertThat(existing.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(existing.getEmailVerifiedAt()).isNotNull();
        // A role is never granted by linking an identity provider.
        assertThat(existing.getRole()).isEqualTo(Role.ADMIN);
        // The password the person chose earlier keeps working.
        assertThat(existing.getPasswordHash()).isEqualTo("$2a$12$stored-hash");
        verify(auditService).record(
                eq(existing),
                eq("USER_SIGNED_IN_WITH_GOOGLE"),
                eq("USER"),
                any(),
                isNull(),
                eq(Map.of("newAccount", false, "linkedExistingAccount", true)),
                eq(client()));
    }

    @Test
    void signsInTheAccountAlreadyBoundToTheGoogleSubject() {
        User linked = user(UserStatus.ACTIVE).withGoogleSubject(SUBJECT).build();
        when(verifier.verify(ID_TOKEN)).thenReturn(identity("Asha Verma"));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(linked));
        when(authenticationService.issueSession(linked)).thenReturn(session(linked));

        service.signIn(request(), client());

        verify(users, never()).findByEmailIgnoreCase(anyString());
        assertThat(linked.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void refusesAnAccountThatIsNotActive() {
        User suspended = user(UserStatus.SUSPENDED).withGoogleSubject(SUBJECT).build();
        when(verifier.verify(ID_TOKEN)).thenReturn(identity("Asha Verma"));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(suspended));

        assertThatThrownBy(() -> service.signIn(request(), client()))
                .isInstanceOf(UnauthorizedException.class);

        verify(users, never()).save(any());
        verifyNoInteractions(auditService, authenticationService);
    }

    @Test
    void refusesToReviveASuspendedAccountThroughLinking() {
        User suspended = user(UserStatus.SUSPENDED).build();
        when(verifier.verify(ID_TOKEN)).thenReturn(identity("Asha Verma"));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(suspended));

        assertThatThrownBy(() -> service.signIn(request(), client()))
                .isInstanceOf(UnauthorizedException.class);

        assertThat(suspended.getGoogleSubject()).isNull();
        verify(users, never()).save(any());
    }

    @Test
    void refusesToBindAnAddressThatBelongsToAnotherGoogleAccount() {
        User otherBinding = user(UserStatus.ACTIVE).withGoogleSubject("other-subject").build();
        when(verifier.verify(ID_TOKEN)).thenReturn(identity("Asha Verma"));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(otherBinding));

        assertThatThrownBy(() -> service.signIn(request(), client()))
                .isInstanceOf(ConflictException.class);

        assertThat(otherBinding.getGoogleSubject()).isEqualTo("other-subject");
    }

    @Test
    void fallsBackToTheLocalPartWhenGoogleSendsNoName() {
        when(verifier.verify(ID_TOKEN)).thenReturn(identity(null));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.empty());
        when(authenticationService.issueSession(any(User.class))).thenAnswer(invocation ->
                session(invocation.getArgument(0)));

        service.signIn(request(), client());

        assertThat(savedUser().getDisplayName()).isEqualTo("asha.verma");
    }

    @Test
    void truncatesAnOverlongGoogleName() {
        when(verifier.verify(ID_TOKEN)).thenReturn(identity("A".repeat(200)));
        when(users.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.empty());
        when(authenticationService.issueSession(any(User.class))).thenAnswer(invocation ->
                session(invocation.getArgument(0)));

        service.signIn(request(), client());

        assertThat(savedUser().getDisplayName()).hasSize(120);
    }

    @Test
    void rateLimitsPerIpBeforeVerifyingAnyToken() {
        doThrow(new RateLimitExceededException(60))
                .when(rateLimitService)
                .check(eq("google:ip:" + client().ipAddress()), anyInt(), any(Duration.class));

        assertThatThrownBy(() -> service.signIn(request(), client()))
                .isInstanceOf(RateLimitExceededException.class);

        verifyNoInteractions(verifier, users, auditService, authenticationService);
    }

    private User savedUser() {
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(users).save(captor.capture());
        return captor.getValue();
    }

    private static GoogleSignInRequest request() {
        return new GoogleSignInRequest(ID_TOKEN);
    }

    private static GoogleIdentity identity(String displayName) {
        return new GoogleIdentity(SUBJECT, EMAIL, displayName);
    }

    private static ClientInfo client() {
        return new ClientInfo("203.0.113.7", "JUnit");
    }

    private static AuthenticationService.Session session(User user) {
        return new AuthenticationService.Session(
                "access-token", "refresh-token", Instant.now().plusSeconds(3600), user);
    }

    private static AuthProperties properties() {
        return new AuthProperties(
                null,
                null,
                null,
                "http://localhost:5173",
                null,
                new AuthProperties.RateLimit(
                        10, 5, Duration.ofMinutes(15),
                        5, Duration.ofHours(1),
                        3, 10, Duration.ofHours(1),
                        5, Duration.ofHours(1)));
    }

    private static UserBuilder user(UserStatus status) {
        return new UserBuilder(status);
    }

    private static final class UserBuilder {

        private final User user = new User();

        private UserBuilder(UserStatus status) {
            user.setEmail(EMAIL);
            user.setDisplayName("Asha Verma");
            user.setRole(Role.USER);
            user.setStatus(status);
        }

        private UserBuilder withPasswordHash(String hash) {
            user.setPasswordHash(hash);
            return this;
        }

        private UserBuilder withRole(Role role) {
            user.setRole(role);
            return this;
        }

        private UserBuilder withGoogleSubject(String subject) {
            user.setGoogleSubject(subject);
            return this;
        }

        private User build() {
            return user;
        }
    }
}
