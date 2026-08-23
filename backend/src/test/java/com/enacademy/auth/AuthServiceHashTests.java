package com.enacademy.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AuthServiceHashTests {
    @Test void tokenHashesAreStableAndDoNotExposeTheToken() {
        String raw = "very-secret-refresh-token";
        String hash = AuthService.hash(raw);
        assertThat(hash).hasSize(64).doesNotContain(raw);
        assertThat(AuthService.hash(raw)).isEqualTo(hash);
        assertThat(AuthService.hash(raw + "x")).isNotEqualTo(hash);
    }
}
