package com.gecarchive.auth.mail;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

import com.gecarchive.auth.entity.AuthTokenPurpose;
import com.gecarchive.user.entity.User;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Test-profile mail sender that keeps messages in memory so integration tests
 * can retrieve verification and reset tokens.
 */
@Component
@Profile("test")
public class CapturingAuthMailSender implements AuthMailSender {

    private final List<CapturedMail> messages = new CopyOnWriteArrayList<>();

    @Override
    public void sendVerificationEmail(User user, String token) {
        messages.add(new CapturedMail(
                user.getEmail().toLowerCase(Locale.ROOT),
                AuthTokenPurpose.EMAIL_VERIFICATION,
                token));
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        messages.add(new CapturedMail(
                user.getEmail().toLowerCase(Locale.ROOT),
                AuthTokenPurpose.PASSWORD_RESET,
                token));
    }

    public Optional<CapturedMail> latest(String email, AuthTokenPurpose purpose) {
        String normalized = email.toLowerCase(Locale.ROOT);
        CapturedMail match = null;
        for (CapturedMail message : messages) {
            if (message.email().equals(normalized) && message.purpose() == purpose) {
                match = message;
            }
        }
        return Optional.ofNullable(match);
    }

    public int count() {
        return messages.size();
    }

    public void clear() {
        messages.clear();
    }

    public record CapturedMail(String email, AuthTokenPurpose purpose, String token) {
    }
}
