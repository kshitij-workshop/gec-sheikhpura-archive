package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.auth.dto.RegisterRequest;
import com.gecarchive.auth.entity.AuthTokenPurpose;
import com.gecarchive.auth.mail.AuthMailSender;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.common.text.Emails;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final AuthTokenService authTokens;
    private final AuthMailSender mailSender;
    private final AuditService auditService;
    private final RateLimitService rateLimitService;
    private final AuthProperties properties;

    public RegistrationService(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy,
            AuthTokenService authTokens,
            AuthMailSender mailSender,
            AuditService auditService,
            RateLimitService rateLimitService,
            AuthProperties properties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.authTokens = authTokens;
        this.mailSender = mailSender;
        this.auditService = auditService;
        this.rateLimitService = rateLimitService;
        this.properties = properties;
    }

    @Transactional
    public void register(RegisterRequest request, ClientInfo client) {
        String email = Emails.normalize(request.email());
        String displayName = request.displayName().trim();
        passwordPolicy.validate(request.password(), email, displayName);
        rateLimitService.check(
                "register:ip:" + client.ipAddress(),
                properties.rateLimit().registerPerIp(),
                properties.rateLimit().registerWindow());

        Optional<User> existing = users.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
                sendVerification(user);
            }
            return;
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(displayName);
        user.setRole(Role.USER);
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        users.save(user);

        sendVerification(user);
        auditService.record(
                user,
                "USER_REGISTERED",
                "USER",
                user.getId(),
                null,
                Map.of("role", user.getRole().name(), "status", user.getStatus().name()),
                client);
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        User user = authTokens.consume(rawToken, AuthTokenPurpose.EMAIL_VERIFICATION);
        Instant now = Instant.now();

        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(now);
        }
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            user.setStatus(UserStatus.ACTIVE);
        }
        users.save(user);

        auditService.record(
                null,
                "EMAIL_VERIFIED",
                "USER",
                user.getId(),
                null,
                Map.of("emailVerified", true),
                null);
    }

    @Transactional
    public void resendVerification(String emailAddress, ClientInfo client) {
        rateLimitService.check(
                "resend-verification:ip:" + client.ipAddress(),
                properties.rateLimit().registerPerIp(),
                properties.rateLimit().registerWindow());
        String email = Emails.normalize(emailAddress);
        users.findByEmailIgnoreCase(email)
                .filter(user -> user.getStatus() == UserStatus.PENDING_VERIFICATION)
                .ifPresent(this::sendVerification);
    }

    private void sendVerification(User user) {
        String token = authTokens.issue(
                user,
                AuthTokenPurpose.EMAIL_VERIFICATION,
                properties.tokens().verificationTtl());
        mailSender.sendVerificationEmail(user, token);
    }
}
