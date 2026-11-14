package com.gecarchive.auth.service;

import java.time.Duration;
import java.util.Optional;

import com.gecarchive.audit.service.AuditService;
import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FirstSuperAdminBootstrapTest {

    @Mock
    private UserRepository users;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditService auditService;

    private FirstSuperAdminBootstrap bootstrap;

    @BeforeEach
    void setUp() {
        bootstrap = new FirstSuperAdminBootstrap(
                users,
                passwordEncoder,
                new PasswordPolicy(),
                auditService,
                properties("admin@example.test", "BootstrapPass1234"));
    }

    @Test
    void createsTheFirstSuperAdminWhenNoneExists() {
        when(users.findByEmailIgnoreCase("admin@example.test")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("BootstrapPass1234")).thenReturn("hashed-value");

        bootstrap.run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        User user = saved.getValue();

        assertThat(user.getEmail()).isEqualTo("admin@example.test");
        assertThat(user.getPasswordHash()).isEqualTo("hashed-value");
        assertThat(user.getRole()).isEqualTo(Role.SUPER_ADMIN);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getEmailVerifiedAt()).isNotNull();
        assertThat(user.isPasswordChangeRequired()).isTrue();

        verify(auditService).record(
                eq(null),
                eq("SUPER_ADMIN_BOOTSTRAPPED"),
                eq("USER"),
                any(),
                eq(null),
                any(),
                eq(null));
    }

    @Test
    void doesNothingWithoutConfiguredCredentials() {
        FirstSuperAdminBootstrap unconfigured = new FirstSuperAdminBootstrap(
                users,
                passwordEncoder,
                new PasswordPolicy(),
                auditService,
                properties("", ""));

        assertThatCode(() -> unconfigured.run(null)).doesNotThrowAnyException();

        verifyNoInteractions(users, passwordEncoder);
    }

    @Test
    void skipsWhenAnActiveSuperAdminAlreadyExists() {
        when(users.existsByRoleAndStatus(Role.SUPER_ADMIN, UserStatus.ACTIVE)).thenReturn(true);

        bootstrap.run(null);

        verify(users, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    void skipsWhenTheConfiguredEmailIsAlreadyRegistered() {
        when(users.findByEmailIgnoreCase("admin@example.test"))
                .thenReturn(Optional.of(new User()));

        bootstrap.run(null);

        verify(users, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    void rejectsAWeakBootstrapPassword() {
        FirstSuperAdminBootstrap weak = new FirstSuperAdminBootstrap(
                users,
                passwordEncoder,
                new PasswordPolicy(),
                auditService,
                properties("weak@example.test", "short"));

        when(users.findByEmailIgnoreCase("weak@example.test")).thenReturn(Optional.empty());
        when(users.existsByRoleAndStatus(Role.SUPER_ADMIN, UserStatus.ACTIVE)).thenReturn(false);

        assertThatThrownBy(() -> weak.run(null)).isInstanceOf(BadRequestException.class);

        verify(users, never()).save(any());
    }

    private AuthProperties properties(String email, String password) {
        return new AuthProperties(
                new AuthProperties.Jwt("https://gecs-archive.example", "test-secret-value-0123456789abcdef", Duration.ofMinutes(15)),
                new AuthProperties.RefreshToken(Duration.ofDays(7), Duration.ofDays(30), "gecs_refresh", false),
                new AuthProperties.Tokens(Duration.ofHours(24), Duration.ofHours(1)),
                "http://localhost:5173",
                new AuthProperties.Bootstrap(email, password, "Archive Administrator"),
                new AuthProperties.RateLimit(10, 5, Duration.ofMinutes(15), 5, Duration.ofHours(1), 3, 10,
                        Duration.ofHours(1), 5, Duration.ofHours(1)));
    }
}
