package com.gecarchive.auth.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TokenHasherTest {

    @Test
    void generatedTokensAreUrlSafeAndUnique() {
        String first = TokenHasher.generateOpaqueToken();
        String second = TokenHasher.generateOpaqueToken();

        assertThat(first).isNotEqualTo(second);
        assertThat(first).matches("^[A-Za-z0-9_-]{43}$");
        assertThat(second).matches("^[A-Za-z0-9_-]{43}$");
    }

    @Test
    void sha256ProducesTheStandardHexDigest() {
        assertThat(TokenHasher.sha256Hex("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    void hashingIsStableAndNotReversibleToTheRawValue() {
        String raw = TokenHasher.generateOpaqueToken();
        String hash = TokenHasher.sha256Hex(raw);

        assertThat(hash).hasSize(64).isEqualTo(TokenHasher.sha256Hex(raw));
        assertThat(hash).isNotEqualTo(raw);
    }
}
