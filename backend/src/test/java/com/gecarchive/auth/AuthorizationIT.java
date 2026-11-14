package com.gecarchive.auth;

import java.util.UUID;

import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

class AuthorizationIT extends AbstractAuthIntegrationTest {

    @Test
    void adminEndpointsAreClosedToGuestsAndRegularUsers() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, "Bearer"));

        String email = uniqueEmail("plain-user");
        createActiveUser(email, defaultPassword(), Role.USER);
        String token = accessToken(login(email, defaultPassword()));

        mockMvc.perform(get("/api/v1/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminsCanListButNotChangeRoles() throws Exception {
        String adminEmail = uniqueEmail("admin-role");
        createActiveUser(adminEmail, defaultPassword(), Role.ADMIN);
        String adminToken = accessToken(login(adminEmail, defaultPassword()));

        mockMvc.perform(get("/api/v1/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());

        User target = createActiveUser(uniqueEmail("promote-target"), defaultPassword(), Role.USER);

        mockMvc.perform(patch("/api/v1/admin/users/" + target.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"ADMIN"}"""))
                .andExpect(status().isForbidden());

        assertThat(users.findById(target.getId()).orElseThrow().getRole()).isEqualTo(Role.USER);
    }

    @Test
    void superAdminCanPromoteAUserAndTheChangeIsAudited() throws Exception {
        String superEmail = uniqueEmail("super-promoter");
        User superAdmin = createActiveUser(superEmail, defaultPassword(), Role.SUPER_ADMIN);
        String superToken = accessToken(login(superEmail, defaultPassword()));

        User target = createActiveUser(uniqueEmail("promote-me"), defaultPassword(), Role.USER);

        mockMvc.perform(patch("/api/v1/admin/users/" + target.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + superToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"ADMIN"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        assertThat(users.findById(target.getId()).orElseThrow().getRole()).isEqualTo(Role.ADMIN);

        var auditPage = auditLogs.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
                "USER", target.getId(), PageRequest.of(0, 10));
        assertThat(auditPage.getContent())
                .anyMatch(entry -> entry.getAction().equals("USER_ROLE_CHANGED")
                        && entry.getActor() != null
                        && entry.getActor().getId().equals(superAdmin.getId()));
    }

    @Test
    void superAdminCannotChangeTheirOwnRoleOrStatus() throws Exception {
        String email = uniqueEmail("self-change");
        User superAdmin = createActiveUser(email, defaultPassword(), Role.SUPER_ADMIN);
        String token = accessToken(login(email, defaultPassword()));

        mockMvc.perform(patch("/api/v1/admin/users/" + superAdmin.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"USER"}"""))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/v1/admin/users/" + superAdmin.getId() + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"SUSPENDED"}"""))
                .andExpect(status().isForbidden());

        assertThat(users.findById(superAdmin.getId()).orElseThrow().getRole())
                .isEqualTo(Role.SUPER_ADMIN);
    }

    @Test
    void lastActiveSuperAdminCannotBeDemotedOrDeactivated() throws Exception {
        String email = uniqueEmail("last-super");
        User lastSuperAdmin = createActiveUser(email, defaultPassword(), Role.SUPER_ADMIN);

        users.findAll().stream()
                .filter(user -> user.getRole() == Role.SUPER_ADMIN
                        && user.getStatus() == UserStatus.ACTIVE
                        && !user.getId().equals(lastSuperAdmin.getId()))
                .forEach(user -> {
                    user.setStatus(UserStatus.SUSPENDED);
                    users.saveAndFlush(user);
                });

        String token = accessToken(login(email, defaultPassword()));

        mockMvc.perform(patch("/api/v1/admin/users/" + lastSuperAdmin.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"ADMIN"}"""))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/v1/admin/users/" + lastSuperAdmin.getId() + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"SUSPENDED"}"""))
                .andExpect(status().isForbidden());
    }

    @Test
    void guestRoleCannotBePersisted() throws Exception {
        String email = uniqueEmail("guest-role");
        createActiveUser(email, defaultPassword(), Role.SUPER_ADMIN);
        String token = accessToken(login(email, defaultPassword()));
        User target = createActiveUser(uniqueEmail("guest-target"), defaultPassword(), Role.USER);

        mockMvc.perform(patch("/api/v1/admin/users/" + target.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"GUEST"}"""))
                .andExpect(status().isBadRequest());

        assertThat(users.findById(target.getId()).orElseThrow().getRole()).isEqualTo(Role.USER);
    }

    @Test
    void adminCannotManageAnotherAdministrator() throws Exception {
        String adminEmail = uniqueEmail("admin-manager");
        createActiveUser(adminEmail, defaultPassword(), Role.ADMIN);
        String adminToken = accessToken(login(adminEmail, defaultPassword()));
        User otherAdmin = createActiveUser(uniqueEmail("admin-victim"), defaultPassword(), Role.ADMIN);

        mockMvc.perform(patch("/api/v1/admin/users/" + otherAdmin.getId() + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"SUSPENDED"}"""))
                .andExpect(status().isForbidden());

        assertThat(users.findById(otherAdmin.getId()).orElseThrow().getStatus())
                .isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void roleChangeRevokesTheTargetUsersSessions() throws Exception {
        String superEmail = uniqueEmail("super-revoke");
        createActiveUser(superEmail, defaultPassword(), Role.SUPER_ADMIN);
        String superToken = accessToken(login(superEmail, defaultPassword()));

        String targetEmail = uniqueEmail("revoke-target");
        User target = createActiveUser(targetEmail, defaultPassword(), Role.USER);
        var targetLogin = login(targetEmail, defaultPassword());
        var targetCookie = refreshCookie(targetLogin);

        mockMvc.perform(patch("/api/v1/admin/users/" + target.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + superToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"ADMIN"}"""))
                .andExpect(status().isOk());

        var afterRoleChange = refresh(targetCookie, csrf());
        assertThat(afterRoleChange.getResponse().getStatus())
                .as("role change must revoke refresh tokens")
                .isEqualTo(401);
    }

    @Test
    void unknownUserReturnsNotFound() throws Exception {
        String email = uniqueEmail("notfound-admin");
        createActiveUser(email, defaultPassword(), Role.SUPER_ADMIN);
        String token = accessToken(login(email, defaultPassword()));

        mockMvc.perform(patch("/api/v1/admin/users/" + UUID.randomUUID() + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"SUSPENDED"}"""))
                .andExpect(status().isNotFound());
    }
}
