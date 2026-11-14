package com.gecarchive.auth.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.gecarchive.common.error.BadRequestException;

import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {

    private static final int MINIMUM_LENGTH = 12;
    private static final int MAXIMUM_LENGTH = 128;

    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password",
            "password1",
            "password123",
            "password1234",
            "123456789012",
            "1234567890123",
            "qwertyuiop12",
            "qwerty123456",
            "letmein12345",
            "welcome12345",
            "admin1234567",
            "iloveyou1234",
            "abc123456789",
            "changeme1234");

    public void validate(String rawPassword, String email, String displayName) {
        List<String> violations = new ArrayList<>();

        if (rawPassword == null) {
            throw new BadRequestException("Password does not meet the security policy.");
        }

        if (rawPassword.length() < MINIMUM_LENGTH) {
            violations.add("must be at least " + MINIMUM_LENGTH + " characters");
        }
        if (rawPassword.length() > MAXIMUM_LENGTH) {
            violations.add("must be at most " + MAXIMUM_LENGTH + " characters");
        }
        if (rawPassword.chars().noneMatch(Character::isLetter)) {
            violations.add("must contain a letter");
        }
        if (rawPassword.chars().noneMatch(Character::isDigit)) {
            violations.add("must contain a number");
        }
        if (rawPassword.chars().distinct().count() == 1) {
            violations.add("must not repeat a single character");
        }

        String normalized = rawPassword.toLowerCase(Locale.ROOT);
        if (COMMON_PASSWORDS.contains(normalized)) {
            violations.add("must not be a commonly used password");
        }
        if (email != null && normalized.equals(email.trim().toLowerCase(Locale.ROOT))) {
            violations.add("must not be the same as the email address");
        }
        if (displayName != null && !displayName.isBlank()
                && normalized.equals(displayName.trim().toLowerCase(Locale.ROOT))) {
            violations.add("must not be the same as the display name");
        }

        if (!violations.isEmpty()) {
            throw new BadRequestException(
                    "Password does not meet the security policy: " + String.join("; ", violations) + ".");
        }
    }
}
