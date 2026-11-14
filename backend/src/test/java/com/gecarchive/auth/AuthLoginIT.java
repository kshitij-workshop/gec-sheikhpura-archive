package com.gecarchive.auth;

import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.UserStatus;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthLoginIT extends AbstractAuthIntegrationTest {

    @Test
    void unverifiedAccountCannotLogin() throws Exception {
        String email = uniqueEmail("unverified");
        register(email, defaultPassword(), "Unverified Contributor");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}""".formatted(email, defaultPassword())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void verifiedAccountCanLoginAndReadProfile() throws Exception {
        String email = uniqueEmail("login");
        registerAndVerify(email, defaultPassword(), "Verified Contributor");

        var result = login(email, defaultPassword());

        mockMvc.perform(get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(result)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.passwordChangeRequired").value(false));

        assertThat(users.findByEmailIgnoreCase(email).orElseThrow().getLastLoginAt()).isNotNull();
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        String email = uniqueEmail("wrong-password");
        registerAndVerify(email, defaultPassword(), "Wrong Password");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"WrongPassword123"}""".formatted(email)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void suspendedAccountCannotLogin() throws Exception {
        String email = uniqueEmail("suspended-login");
        var user = createActiveUser(email, defaultPassword(), Role.USER);
        user.setStatus(UserStatus.SUSPENDED);
        users.saveAndFlush(user);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}""".formatted(email, defaultPassword())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void profileRequiresAValidAccessToken() throws Exception {
        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void suspensionInvalidatesAnExistingAccessToken() throws Exception {
        String email = uniqueEmail("suspended-token");
        var user = createActiveUser(email, defaultPassword(), Role.USER);
        var result = login(email, defaultPassword());
        String token = accessToken(result);

        mockMvc.perform(get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        user = users.findById(user.getId()).orElseThrow();
        user.setStatus(UserStatus.SUSPENDED);
        users.saveAndFlush(user);

        mockMvc.perform(get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
