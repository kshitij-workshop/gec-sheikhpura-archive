package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.Map;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.text.Emails;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class FirstSuperAdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FirstSuperAdminBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final AuditService auditService;
    private final AuthProperties properties;

    public FirstSuperAdminBootstrap(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy,
            AuditService auditService,
            AuthProperties properties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.auditService = auditService;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AuthProperties.Bootstrap bootstrap = properties.bootstrap();
        String email = Emails.normalize(bootstrap.email());
        if (email == null || email.isBlank() || bootstrap.password() == null || bootstrap.password().isBlank()) {
            return;
        }

        if (users.existsByRoleAndStatus(Role.SUPER_ADMIN, UserStatus.ACTIVE)) {
            log.info("Skipping super administrator bootstrap because an active super administrator already exists");
            return;
        }

        if (users.findByEmailIgnoreCase(email).isPresent()) {
            log.warn("Skipping super administrator bootstrap because the configured email already belongs to a user");
            return;
        }

        passwordPolicy.validate(bootstrap.password(), email, bootstrap.displayName());

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(bootstrap.password()));
        user.setDisplayName(bootstrap.displayName().trim());
        user.setRole(Role.SUPER_ADMIN);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        user.setPasswordChangeRequired(true);
        users.save(user);

        auditService.record(
                null,
                "SUPER_ADMIN_BOOTSTRAPPED",
                "USER",
                user.getId(),
                null,
                Map.of("role", Role.SUPER_ADMIN.name(), "email", email),
                null);

        log.warn("Bootstrapped the first super administrator; change the password immediately after signing in");
    }
}
