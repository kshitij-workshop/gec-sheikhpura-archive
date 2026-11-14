package com.gecarchive.auth;

import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PasswordChangeRequiredIT extends AbstractAuthIntegrationTest {

    private User createAdminWithForcedPasswordChange(String email) {
        User user = createActiveUser(email, defaultPassword(), Role.ADMIN);
        user.setPasswordChangeRequired(true);
        return users.saveAndFlush(user);
    }

    @Test
    void forcedPasswordChangeBlocksNormalEndpointsUntilCompleted() throws Exception {
        String email = uniqueEmail("forced-change");
        createAdminWithForcedPasswordChange(email);

        var login = login(email, defaultPassword());
        String token = accessToken(login);

        mockMvc.perform(get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordChangeRequired").value(true));

        mockMvc.perform(get("/api/v1/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Password change required"));

        mockMvc.perform(patch("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Renamed"}"""))
                .andExpect(status().isForbidden());
    }

    @Test
    void wrongCurrentPasswordIsRejected() throws Exception {
        String email = uniqueEmail("forced-wrong");
        createAdminWithForcedPasswordChange(email);
        String token = accessToken(login(email, defaultPassword()));

        mockMvc.perform(patch("/api/v1/me/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"NotTheRealPass123","newPassword":"NewArchivePass123"}"""))
                .andExpect(status().isBadRequest());

        assertThat(users.findByEmailIgnoreCase(email).orElseThrow().isPasswordChangeRequired())
                .isTrue();
    }

    @Test
    void completingTheChangeUnlocksTheAccountAndRevokesSessions() throws Exception {
        String email = uniqueEmail("forced-complete");
        createAdminWithForcedPasswordChange(email);

        var login = login(email, defaultPassword());
        String token = accessToken(login);
        var cookie = refreshCookie(login);

        mockMvc.perform(patch("/api/v1/me/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"UnlockedPass1234"}"""
                                .formatted(defaultPassword())))
                .andExpect(status().isNoContent());

        assertThat(users.findByEmailIgnoreCase(email).orElseThrow().isPasswordChangeRequired())
                .isFalse();

        mockMvc.perform(get("/api/v1/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        var afterChange = refresh(cookie, csrf());
        assertThat(afterChange.getResponse().getStatus()).isEqualTo(401);

        login(email, "UnlockedPass1234");
    }
}
