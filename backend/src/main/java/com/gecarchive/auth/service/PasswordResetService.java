package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.Map;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.auth.dto.ChangePasswordRequest;
import com.gecarchive.auth.dto.ForgotPasswordRequest;
import com.gecarchive.auth.dto.ResetPasswordRequest;
import com.gecarchive.auth.entity.AuthTokenPurpose;
import com.gecarchive.auth.mail.AuthMailSender;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.UnauthorizedException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.common.text.Emails;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final AuthTokenService authTokens;
    private final RefreshTokenService refreshTokenService;
    private final RateLimitService rateLimitService;
    private final AuthMailSender mailSender;
    private final AuditService auditService;
    private final AuthProperties properties;

    public PasswordResetService(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy,
            AuthTokenService authTokens,
            RefreshTokenService refreshTokenService,
            RateLimitService rateLimitService,
            AuthMailSender mailSender,
            AuditService auditService,
            AuthProperties properties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.authTokens = authTokens;
        this.refreshTokenService = refreshTokenService;
        this.rateLimitService = rateLimitService;
        this.mailSender = mailSender;
        this.auditService = auditService;
        this.properties = properties;
    }

    @Transactional
    public void requestReset(ForgotPasswordRequest request, ClientInfo client) {
        String email = Emails.normalize(request.email());
        var limits = properties.rateLimit();
        rateLimitService.check(
                "forgot:account:" + email,
                limits.forgotPasswordPerAccount(),
                limits.forgotPasswordWindow());
        rateLimitService.check(
                "forgot:ip:" + client.ipAddress(),
                limits.forgotPasswordPerIp(),
                limits.forgotPasswordWindow());

        users.findByEmailIgnoreCase(email)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE
                        || user.getStatus() == UserStatus.PENDING_VERIFICATION)
                .ifPresent(user -> {
                    String token = authTokens.issue(
                            user,
                            AuthTokenPurpose.PASSWORD_RESET,
                            properties.tokens().passwordResetTtl());
                    mailSender.sendPasswordResetEmail(user, token);
                });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, ClientInfo client) {
        rateLimitService.check(
                "reset:ip:" + client.ipAddress(),
                properties.rateLimit().resetPasswordPerIp(),
                properties.rateLimit().resetPasswordWindow());

        User user = authTokens.consume(request.token(), AuthTokenPurpose.PASSWORD_RESET);
        passwordPolicy.validate(request.password(), user.getEmail(), user.getDisplayName());

        if (user.getPasswordHash() != null
                && passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException("The new password must be different from the current password.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPasswordChangeRequired(false);
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(Instant.now());
        }
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            user.setStatus(UserStatus.ACTIVE);
        }
        users.save(user);

        refreshTokenService.revokeAllAfterPasswordChange(user.getId());
        auditService.record(
                user,
                "PASSWORD_RESET",
                "USER",
                user.getId(),
                null,
                Map.of("passwordReset", true),
                client);
    }

    @Transactional
    public void changePassword(
            AuthenticatedUser principal,
            ChangePasswordRequest request,
            ClientInfo client) {

        User user = users.findById(principal.id()).orElseThrow(UnauthorizedException::new);

        if (user.getPasswordHash() == null) {
            throw new BadRequestException(
                    "This account signs in with Google. Use \"Forgot password\" to set a password first.");
        }

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("The current password is incorrect.");
        }
        passwordPolicy.validate(request.newPassword(), user.getEmail(), user.getDisplayName());
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("The new password must be different from the current password.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPasswordChangeRequired(false);
        users.save(user);

        refreshTokenService.revokeAllAfterPasswordChange(user.getId());
        auditService.record(
                user,
                "PASSWORD_CHANGED",
                "USER",
                user.getId(),
                null,
                Map.of("passwordChanged", true),
                client);
    }
}
