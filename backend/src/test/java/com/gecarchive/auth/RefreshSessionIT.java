package com.gecarchive.auth;

import java.time.Duration;
import java.time.Instant;

import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RefreshSessionIT extends AbstractAuthIntegrationTest {

    @Autowired
    private JwtDecoder jwtDecoder;

    @Test
    void refreshRotatesTheTokenAndReuseRevokesTheFamily() throws Exception {
        String email = uniqueEmail("refresh");
        var user = createActiveUser(email, defaultPassword(), Role.USER);
        var login = login(email, defaultPassword());
        var originalCookie = refreshCookie(login);
        var csrf = csrf();

        var rotated = refresh(originalCookie, csrf);
        assertThat(rotated.getResponse().getStatus()).isEqualTo(200);
        var rotatedCookie = rotated.getResponse().getCookie(REFRESH_COOKIE);
        assertThat(rotatedCookie).isNotNull();
        assertThat(rotatedCookie.getValue()).isNotEqualTo(originalCookie.getValue());

        var reuse = refresh(originalCookie, csrf);
        assertThat(reuse.getResponse().getStatus()).isEqualTo(401);

        var afterReuse = refresh(rotatedCookie, csrf);
        assertThat(afterReuse.getResponse().getStatus()).isEqualTo(401);

        assertThat(users.findById(user.getId()).orElseThrow().getId()).isEqualTo(user.getId());
    }

    @Test
    void logoutRevokesTheCurrentFamily() throws Exception {
        String email = uniqueEmail("logout");
        createActiveUser(email, defaultPassword(), Role.USER);
        var login = login(email, defaultPassword());
        var cookie = refreshCookie(login);
        var csrf = csrf();

        var logout = logout(cookie, csrf);
        assertThat(logout.getResponse().getStatus()).isEqualTo(204);

        var afterLogout = refresh(cookie, csrf);
        assertThat(afterLogout.getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void refreshRequiresCsrfProtection() throws Exception {
        String email = uniqueEmail("refresh-csrf");
        createActiveUser(email, defaultPassword(), Role.USER);
        var login = login(email, defaultPassword());
        var cookie = refreshCookie(login);

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(cookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void refreshWithoutARefreshCookieIsRejected() throws Exception {
        var csrf = csrf();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(csrf.cookie())
                        .header(CSRF_HEADER, csrf.token()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshFromADisallowedOriginIsRejected() throws Exception {
        String email = uniqueEmail("refresh-origin");
        createActiveUser(email, defaultPassword(), Role.USER);
        var login = login(email, defaultPassword());
        var cookie = refreshCookie(login);
        var csrf = csrf();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(cookie, csrf.cookie())
                        .header(CSRF_HEADER, csrf.token())
                        .header(HttpHeaders.ORIGIN, "https://evil.example"))
                .andExpect(status().isForbidden());
    }

    @Test
    void refreshCookieIsHttpOnlyAndScopedToAuthEndpoints() throws Exception {
        String email = uniqueEmail("cookie-flags");
        createActiveUser(email, defaultPassword(), Role.USER);

        var login = login(email, defaultPassword());
        String setCookie = login.getResponse().getHeader(HttpHeaders.SET_COOKIE);

        assertThat(setCookie)
                .contains(REFRESH_COOKIE + "=")
                .contains("HttpOnly")
                .contains("SameSite=Lax")
                .contains("Path=/api/v1/auth");
    }

    @Test
    void accessTokenContainsOnlyTheExpectedClaims() throws Exception {
        String email = uniqueEmail("claims");
        var user = createActiveUser(email, defaultPassword(), Role.ADMIN);
        var login = login(email, defaultPassword());

        Jwt jwt = jwtDecoder.decode(accessToken(login));

        assertThat(jwt.getSubject()).isEqualTo(user.getId().toString());
        assertThat(jwt.getClaimAsString("role")).isEqualTo("ADMIN");
        assertThat(jwt.getIssuer().toString()).isEqualTo("https://gecs-archive.example");
        assertThat(jwt.getId()).isNotBlank();
        assertThat(Duration.between(Instant.now(), jwt.getExpiresAt()).toMinutes())
                .isBetween(10L, 15L);
        assertThat(jwt.getClaims()).doesNotContainKeys("email", "password", "displayName");
    }
}
