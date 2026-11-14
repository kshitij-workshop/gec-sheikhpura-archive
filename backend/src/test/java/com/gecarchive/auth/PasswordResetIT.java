package com.gecarchive.auth;

import com.gecarchive.auth.entity.AuthTokenPurpose;
import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PasswordResetIT extends AbstractAuthIntegrationTest {

    @Test
    void resetFlowChangesThePasswordAndRevokesSessions() throws Exception {
        String email = uniqueEmail("reset");
        createActiveUser(email, defaultPassword(), Role.USER);
        var login = login(email, defaultPassword());
        var oldRefreshCookie = refreshCookie(login);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());

        String token = capturedToken(email, AuthTokenPurpose.PASSWORD_RESET);
        String newPassword = "BrandNewPass1234";

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"%s"}""".formatted(token, newPassword)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}""".formatted(email, defaultPassword())))
                .andExpect(status().isUnauthorized());

        login(email, newPassword);

        var afterReset = refresh(oldRefreshCookie, csrf());
        assertThat(afterReset.getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void resetTokenCannotBeUsedTwice() throws Exception {
        String email = uniqueEmail("reset-single-use");
        createActiveUser(email, defaultPassword(), Role.USER);
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());

        String token = capturedToken(email, AuthTokenPurpose.PASSWORD_RESET);
        String first = "FirstResetPass123";
        String second = "SecondResetPass123";

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"%s"}""".formatted(token, first)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"%s"}""".formatted(token, second)))
                .andExpect(status().isBadRequest());

        login(email, first);
    }

    @Test
    void forgotPasswordDoesNotRevealUnknownAccounts() throws Exception {
        String email = uniqueEmail("no-such-account");

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());

        assertThat(mailSender.latest(email, AuthTokenPurpose.PASSWORD_RESET)).isEmpty();
    }

    @Test
    void resetRejectsWeakPasswordAndKeepsTheOldOne() throws Exception {
        String email = uniqueEmail("reset-weak");
        createActiveUser(email, defaultPassword(), Role.USER);
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());

        String token = capturedToken(email, AuthTokenPurpose.PASSWORD_RESET);

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"password1234"}""".formatted(token)))
                .andExpect(status().isBadRequest());

        login(email, defaultPassword());
    }

    @Test
    void resetRejectsReusingTheCurrentPassword() throws Exception {
        String email = uniqueEmail("reset-same");
        createActiveUser(email, defaultPassword(), Role.USER);
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());

        String token = capturedToken(email, AuthTokenPurpose.PASSWORD_RESET);

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"%s"}""".formatted(token, defaultPassword())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetTokenIsInvalidatedByANewRequest() throws Exception {
        String email = uniqueEmail("reset-invalidate");
        createActiveUser(email, defaultPassword(), Role.USER);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());
        String firstToken = capturedToken(email, AuthTokenPurpose.PASSWORD_RESET);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}""".formatted(email)))
                .andExpect(status().isAccepted());
        String secondToken = capturedToken(email, AuthTokenPurpose.PASSWORD_RESET);
        assertThat(secondToken).isNotEqualTo(firstToken);

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"InterceptedPass123"}""".formatted(firstToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"LegitimatePass123"}""".formatted(secondToken)))
                .andExpect(status().isNoContent());
    }
}
