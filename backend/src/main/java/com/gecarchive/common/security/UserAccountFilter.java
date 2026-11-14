package com.gecarchive.common.security;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Converts a validated JWT into a principal backed by fresh database state.
 *
 * <p>Account status and role are re-read on every request so suspension,
 * deactivation, and role changes take effect immediately.</p>
 */
public final class UserAccountFilter extends OncePerRequestFilter {

    private final UserRepository users;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    public UserAccountFilter(UserRepository users, RestAuthenticationEntryPoint authenticationEntryPoint) {
        this.users = users;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken jwtAuthentication) {
            UUID userId;
            try {
                userId = UUID.fromString(jwtAuthentication.getToken().getSubject());
            } catch (RuntimeException exception) {
                reject(request, response, jwtAuthentication);
                return;
            }

            Optional<User> candidate = users.findById(userId);
            if (candidate.isEmpty() || candidate.get().getStatus() != UserStatus.ACTIVE) {
                reject(request, response, jwtAuthentication);
                return;
            }

            User user = candidate.get();
            AuthenticatedUser principal = new AuthenticatedUser(
                    user.getId(),
                    user.getEmail(),
                    user.getDisplayName(),
                    user.getRole(),
                    user.isPasswordChangeRequired());

            var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
            var authentication = UsernamePasswordAuthenticationToken.authenticated(
                    principal,
                    jwtAuthentication.getCredentials(),
                    authorities);
            authentication.setDetails(jwtAuthentication.getDetails());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private void reject(
            HttpServletRequest request,
            HttpServletResponse response,
            JwtAuthenticationToken authentication) throws IOException {
        SecurityContextHolder.clearContext();
        authenticationEntryPoint.commence(
                request,
                response,
                new org.springframework.security.authentication.BadCredentialsException(
                        "The account is not active or no longer exists."));
    }
}
