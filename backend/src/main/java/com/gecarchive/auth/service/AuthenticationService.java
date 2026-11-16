package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.Optional;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.auth.dto.LoginRequest;
import com.gecarchive.common.error.UnauthorizedException;
import com.gecarchive.common.text.Emails;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final RateLimitService rateLimitService;
    private final AuthProperties properties;
    private final String timingEqualizerHash;

    public AuthenticationService(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            RefreshTokenService refreshTokenService,
            RateLimitService rateLimitService,
            AuthProperties properties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
        this.rateLimitService = rateLimitService;
        this.properties = properties;
        this.timingEqualizerHash = passwordEncoder.encode("timing-equalizer-not-a-real-password");
    }

    @Transactional
    public Session login(LoginRequest request, String ipAddress) {
        String email = Emails.normalize(request.email());
        var limits = properties.rateLimit();
        rateLimitService.check("login:ip:" + ipAddress, limits.loginPerIp(), limits.loginWindow());
        rateLimitService.check("login:account:" + email, limits.loginPerAccount(), limits.loginWindow());

        Optional<User> candidate = users.findByEmailIgnoreCase(email);
        User user = candidate.orElse(null);
        // Google-only accounts have no password hash; compare against the
        // equalizer hash so timing does not reveal whether the account exists.
        String hash = user == null || user.getPasswordHash() == null
                ? timingEqualizerHash
                : user.getPasswordHash();
        boolean passwordMatches = passwordEncoder.matches(request.password(), hash);

        if (user == null || !passwordMatches || user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException();
        }

        user.setLastLoginAt(Instant.now());
        users.save(user);
        return issueSession(user);
    }

    @Transactional
    public Session refresh(String rawRefreshToken) {
        RefreshTokenService.RotatedRefreshToken rotated = refreshTokenService.rotate(rawRefreshToken);
        String accessToken = jwtTokenService.issueAccessToken(rotated.user());
        return new Session(accessToken, rotated.rawToken(), rotated.expiresAt(), rotated.user());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revokeByRawToken(rawRefreshToken);
    }

    /**
     * Issues the archive's own access token and refresh cookie pair for an
     * already-authenticated user. Used by password login and Google sign-in so
     * both flows produce an identical session.
     */
    public Session issueSession(User user) {
        String accessToken = jwtTokenService.issueAccessToken(user);
        RefreshTokenService.IssuedRefreshToken refreshToken = refreshTokenService.issue(user);
        return new Session(accessToken, refreshToken.rawToken(), refreshToken.expiresAt(), user);
    }

    public record Session(String accessToken, String refreshToken, Instant refreshExpiresAt, User user) {
    }
}
