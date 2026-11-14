package com.gecarchive.common.security;

import java.io.IOException;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Blocks access to everything except password-change and session endpoints while
 * a bootstrap account still uses its initial password.
 */
public final class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED = Set.of(
            "GET /api/v1/me",
            "PATCH /api/v1/me/password",
            "POST /api/v1/auth/logout",
            "POST /api/v1/auth/refresh",
            "GET /api/v1/auth/csrf");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof AuthenticatedUser user
                && user.passwordChangeRequired()
                && !HttpMethod.OPTIONS.matches(request.getMethod())) {

            String key = request.getMethod() + " " + request.getRequestURI();
            if (!ALLOWED.contains(key)) {
                ProblemResponseWriter.write(
                        response,
                        HttpServletResponse.SC_FORBIDDEN,
                        "Password change required",
                        "Change your password before continuing.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
