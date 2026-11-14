package com.gecarchive.common.security;

import java.io.IOException;
import java.util.List;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rejects state-changing API requests whose Origin header is present but not in
 * the configured allowlist. Requests without an Origin header (server-to-server
 * clients, tests) continue and are still protected by CSRF where applicable.
 */
public final class OriginValidationFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of(
            HttpMethod.GET.name(),
            HttpMethod.HEAD.name(),
            HttpMethod.OPTIONS.name(),
            HttpMethod.TRACE.name());

    private final Set<String> allowedOrigins;

    public OriginValidationFilter(List<String> allowedOrigins) {
        this.allowedOrigins = Set.copyOf(allowedOrigins);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.startsWith("/api/") && !SAFE_METHODS.contains(request.getMethod())) {
            String origin = request.getHeader(HttpHeaders.ORIGIN);
            if (origin != null && !origin.isBlank() && !allowedOrigins.contains(origin)) {
                ProblemResponseWriter.write(
                        response,
                        HttpServletResponse.SC_FORBIDDEN,
                        "Forbidden",
                        "The request origin is not allowed.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
