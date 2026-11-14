package com.gecarchive.support;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import com.gecarchive.AbstractIntegrationTest;
import com.gecarchive.audit.repository.AuditLogRepository;
import com.gecarchive.auth.entity.AuthTokenPurpose;
import com.gecarchive.auth.mail.CapturingAuthMailSender;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractAuthIntegrationTest extends AbstractIntegrationTest {

    protected static final String REFRESH_COOKIE = "gecs_refresh";
    protected static final String CSRF_COOKIE = "XSRF-TOKEN";
    protected static final String CSRF_HEADER = "X-XSRF-TOKEN";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected UserRepository users;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected CapturingAuthMailSender mailSender;

    @Autowired
    protected AuditLogRepository auditLogs;

    @BeforeEach
    void clearCapturedMail() {
        mailSender.clear();
    }

    protected String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.test";
    }

    protected String defaultPassword() {
        return "ArchivePass1234";
    }

    protected User createActiveUser(String email, String password, Role role) {
        User user = new User();
        user.setEmail(email.toLowerCase(Locale.ROOT));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName("Test " + role.name());
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        return users.saveAndFlush(user);
    }

    protected void register(String email, String password, String displayName) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s","displayName":"%s"}"""
                                .formatted(email, password, displayName)))
                .andExpect(status().isAccepted());
    }

    protected void registerAndVerify(String email, String password, String displayName) throws Exception {
        register(email, password, displayName);
        String token = mailSender.latest(email, AuthTokenPurpose.EMAIL_VERIFICATION)
                .orElseThrow()
                .token();
        verifyEmail(token);
    }

    protected void verifyEmail(String token) throws Exception {
        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s"}""".formatted(token)))
                .andExpect(status().isNoContent());
    }

    protected String capturedToken(String email, AuthTokenPurpose purpose) {
        return mailSender.latest(email, purpose).orElseThrow().token();
    }

    protected MvcResult login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}""".formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
    }

    protected String accessToken(MvcResult result) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    protected Cookie refreshCookie(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie(REFRESH_COOKIE);
        assertThat(cookie).as("refresh cookie").isNotNull();
        return cookie;
    }

    protected CsrfSession csrf() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        String token = JsonPath.read(result.getResponse().getContentAsString(), "$.token");
        Cookie cookie = result.getResponse().getCookie(CSRF_COOKIE);
        assertThat(cookie).as("CSRF cookie").isNotNull();
        return new CsrfSession(token, cookie);
    }

    protected MvcResult refresh(Cookie refreshCookie, CsrfSession csrf) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie, csrf.cookie())
                        .header(CSRF_HEADER, csrf.token()))
                .andReturn();
    }

    protected MvcResult logout(Cookie refreshCookie, CsrfSession csrf) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(refreshCookie, csrf.cookie())
                        .header(CSRF_HEADER, csrf.token()))
                .andReturn();
    }

    public record CsrfSession(String token, Cookie cookie) {
    }
}
