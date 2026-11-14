package com.gecarchive.auth.service;

import com.gecarchive.common.error.BadRequestException;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void acceptsAStrongPassword() {
        assertThatCode(() -> policy.validate("ArchivePass1234", "user@example.test", "Archive User"))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsShortPasswords() {
        assertThatThrownBy(() -> policy.validate("Short1", "user@example.test", "Archive User"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least 12");
    }

    @Test
    void rejectsPasswordsWithoutDigitsOrLetters() {
        assertThatThrownBy(() -> policy.validate("OnlyLettersHere", "user@example.test", "Archive User"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must contain a number");

        assertThatThrownBy(() -> policy.validate("1234567890123", "user@example.test", "Archive User"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must contain a letter");
    }

    @Test
    void rejectsCommonPasswordsAndIdentityReuse() {
        assertThatThrownBy(() -> policy.validate("password1234", "user@example.test", "Archive User"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("commonly used");

        assertThatThrownBy(() -> policy.validate("user@example.test", "user@example.test", "Archive User"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("email address");

        assertThatThrownBy(() -> policy.validate("Archive User", "user@example.test", "Archive User"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("display name");
    }

    @Test
    void rejectsRepeatedSingleCharacter() {
        assertThatThrownBy(() -> policy.validate("aaaaaaaaaaaa", "user@example.test", "Archive User"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("repeat a single character");
    }
}
