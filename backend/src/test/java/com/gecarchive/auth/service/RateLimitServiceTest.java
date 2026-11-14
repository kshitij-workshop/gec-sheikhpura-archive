package com.gecarchive.auth.service;

import java.time.Duration;

import com.gecarchive.common.error.RateLimitExceededException;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RateLimitServiceTest {

    private final RateLimitService service = new RateLimitService();

    @Test
    void allowsRequestsUpToTheLimit() {
        Duration window = Duration.ofMinutes(5);

        assertThatCode(() -> {
            service.check("login:ip:1.2.3.4", 2, window);
            service.check("login:ip:1.2.3.4", 2, window);
        }).doesNotThrowAnyException();
    }

    @Test
    void rejectsRequestsBeyondTheLimit() {
        Duration window = Duration.ofMinutes(5);
        service.check("login:account:user@example.test", 1, window);

        assertThatThrownBy(() -> service.check("login:account:user@example.test", 1, window))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void tracksKeysIndependently() {
        Duration window = Duration.ofMinutes(5);
        service.check("login:ip:10.0.0.1", 1, window);

        assertThatCode(() -> service.check("login:ip:10.0.0.2", 1, window))
                .doesNotThrowAnyException();
    }

    @Test
    void windowExpiryAllowsNewRequests() throws InterruptedException {
        service.check("short-window", 1, Duration.ofMillis(50));

        assertThatThrownBy(() -> service.check("short-window", 1, Duration.ofMillis(50)))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(exception -> assertThat(
                        ((RateLimitExceededException) exception).getRetryAfterSeconds())
                        .isGreaterThanOrEqualTo(1));

        Thread.sleep(120);

        assertThatCode(() -> service.check("short-window", 1, Duration.ofMillis(50)))
                .doesNotThrowAnyException();
    }
}
