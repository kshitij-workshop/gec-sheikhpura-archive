package com.gecarchive.auth;

import java.util.UUID;

import com.gecarchive.auth.entity.AuthTokenPurpose;
import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.UserStatus;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthRegistrationIT extends AbstractAuthIntegrationTest {

    @Test
    void registrationSendsVerificationAndActivatesAccount() throws Exception {
        String email = uniqueEmail("register");
        register(email, defaultPassword(), "New Contributor");

        var pending = users.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(pending.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
        assertThat(pending.getEmailVerifiedAt()).isNull();

        String token = capturedToken(email, AuthTokenPurpose.EMAIL_VERIFICATION);
        verifyEmail(token);

        var active = users.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(active.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(active.getEmailVerifiedAt()).isNotNull();
        assertThat(active.isPasswordChangeRequired()).isFalse();

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s"}""".formatted(token)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateRegistrationDoesNotCreateAnotherAccount() throws Exception {
        String email = uniqueEmail("duplicate");
        register(email, defaultPassword(), "First Name");
        register(email, defaultPassword(), "Second Name");

        assertThat(users.countByEmailIgnoreCase(email)).isEqualTo(1);
        assertThat(users.findByEmailIgnoreCase(email).orElseThrow().getDisplayName())
                .isEqualTo("First Name");
    }

    @Test
    void shortPasswordIsRejectedBeforeAccountCreation() throws Exception {
        String email = uniqueEmail("short");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"short","displayName":"Short Password"}"""
                                .formatted(email)))
                .andExpect(status().isBadRequest());

        assertThat(users.findByEmailIgnoreCase(email)).isEmpty();
    }

    @Test
    void commonPasswordIsRejectedByPolicy() throws Exception {
        String email = uniqueEmail("common");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1234","displayName":"Common Password"}"""
                                .formatted(email)))
                .andExpect(status().isBadRequest());

        assertThat(users.findByEmailIgnoreCase(email)).isEmpty();
    }

    @Test
    void verificationRejectsUnknownToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s"}""".formatted(UUID.randomUUID())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resendVerificationInvalidatesThePreviousToken() throws Exception {
        String email = uniqueEmail("resend");
        register(email, defaultPassword(), "Resend Contributor");
        String firstToken = capturedToken(email, AuthTokenPurpose.EMAIL_VERIFICATION);

        mockMvc.perform(post("/api/v1/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());

        String secondToken = capturedToken(email, AuthTokenPurpose.EMAIL_VERIFICATION);
        assertThat(secondToken).isNotEqualTo(firstToken);

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s"}""".formatted(firstToken)))
                .andExpect(status().isBadRequest());

        verifyEmail(secondToken);
    }

    @Test
    void emailIsStoredInCanonicalLowercaseForm() throws Exception {
        String email = "MixedCase-" + UUID.randomUUID() + "@Example.Test";
        register(email, defaultPassword(), "Case Contributor");

        var stored = users.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(stored.getEmail()).isEqualTo(email.toLowerCase());

        verifyEmail(capturedToken(email, AuthTokenPurpose.EMAIL_VERIFICATION));
        login(email.toLowerCase(), defaultPassword());
    }
}
