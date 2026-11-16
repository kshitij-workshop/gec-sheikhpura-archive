package com.gecarchive.auth;

import java.util.List;
import java.util.UUID;

import com.gecarchive.audit.entity.AuditLog;
import com.gecarchive.auth.google.GoogleIdentity;
import com.gecarchive.auth.google.GoogleIdentityVerifier;
import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Google sign-in without Google: the ID token verifier is replaced so the test
 * exercises the archive's own linking, session, and audit rules. Signature and
 * JWKS handling are covered by the verifier unit tests and by manual
 * verification with a real Client ID.
 */
class GoogleSignInIT extends AbstractAuthIntegrationTest {

    @MockitoBean
    private GoogleIdentityVerifier verifier;

    @Test
    void createsAnActiveAccountWithoutAPassword() throws Exception {
        String email = uniqueEmail("google-new");
        String subject = "google-" + UUID.randomUUID();
        givenVerified(subject, email, "Asha Verma");

        MvcResult result = googleSignIn("id-token");

        mockMvc.perform(get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(result)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.displayName").value("Asha Verma"));

        User saved = users.findByGoogleSubject(subject).orElseThrow();
        assertThat(saved.getPasswordHash()).isNull();
        assertThat(saved.getEmailVerifiedAt()).isNotNull();
        assertThat(saved.getLastLoginAt()).isNotNull();
        assertThat(refreshCookie(result).isHttpOnly()).isTrue();
        assertThat(auditedActions()).contains("USER_SIGNED_IN_WITH_GOOGLE");
    }

    @Test
    void linksAnUnverifiedPasswordAccountAndActivatesIt() throws Exception {
        String email = uniqueEmail("google-link");
        String subject = "google-" + UUID.randomUUID();
        register(email, defaultPassword(), "Pending Contributor");
        User pending = users.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(pending.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
        givenVerified(subject, email, "Pending Contributor");

        googleSignIn("id-token");

        User linked = users.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(linked.getId()).isEqualTo(pending.getId());
        assertThat(linked.getGoogleSubject()).isEqualTo(subject);
        assertThat(linked.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(linked.getEmailVerifiedAt()).isNotNull();
        // The password chosen at registration is kept, not replaced.
        assertThat(linked.getPasswordHash()).isNotNull();
        // Someone who verifies through Google can now also sign in with it.
        login(email, defaultPassword());
    }

    @Test
    void reusesTheSameAccountOnEveryLaterSignIn() throws Exception {
        String email = uniqueEmail("google-return");
        String subject = "google-" + UUID.randomUUID();
        givenVerified(subject, email, "Returning Person");

        MvcResult first = googleSignIn("id-token");
        MvcResult second = googleSignIn("id-token");

        assertThat(users.findByGoogleSubject(subject).orElseThrow().getId())
                .isEqualTo(users.findByEmailIgnoreCase(email).orElseThrow().getId());
        assertThat(accessToken(first)).isNotEqualTo(accessToken(second));
        assertThat(users.findAll().stream()
                .filter(user -> email.equals(user.getEmail()))
                .count()).isEqualTo(1);
    }

    @Test
    void refusesASuspendedAccount() throws Exception {
        User suspended = createActiveUser(uniqueEmail("google-suspended"), defaultPassword(), Role.USER);
        suspended.setStatus(UserStatus.SUSPENDED);
        users.saveAndFlush(suspended);
        givenVerified("google-" + UUID.randomUUID(), suspended.getEmail(), suspended.getDisplayName());

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"id-token"}"""))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsAnIdTokenTheVerifierRefuses() throws Exception {
        when(verifier.verify("id-token"))
                .thenThrow(new com.gecarchive.common.error.UnauthorizedException());

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"id-token"}"""))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requiresAnIdToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"  "}"""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void passwordLoginStillRefusesAGoogleOnlyAccount() throws Exception {
        String email = uniqueEmail("google-only");
        givenVerified("google-" + UUID.randomUUID(), email, "Google Only");
        googleSignIn("id-token");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}""".formatted(email, defaultPassword())))
                .andExpect(status().isUnauthorized());
    }

    private void givenVerified(String subject, String email, String displayName) {
        when(verifier.verify("id-token"))
                .thenReturn(new GoogleIdentity(subject, email, displayName));
    }

    private MvcResult googleSignIn(String idToken) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"%s"}""".formatted(idToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn();
    }

    private List<String> auditedActions() {
        return auditLogs.findAll().stream().map(AuditLog::getAction).toList();
    }
}
