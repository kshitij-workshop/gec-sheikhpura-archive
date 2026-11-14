package com.gecarchive.auth.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(
        Jwt jwt,
        RefreshToken refreshToken,
        Tokens tokens,
        @DefaultValue("http://localhost:5173") String frontendBaseUrl,
        Bootstrap bootstrap,
        RateLimit rateLimit) {

    public record Jwt(
            @DefaultValue("https://gecs-archive.example") String issuer,
            String secret,
            @DefaultValue("15m") Duration accessTokenTtl) {
    }

    public record RefreshToken(
            @DefaultValue("7d") Duration idleTtl,
            @DefaultValue("30d") Duration absoluteTtl,
            @DefaultValue("gecs_refresh") String cookieName,
            @DefaultValue("true") boolean cookieSecure) {
    }

    public record Tokens(
            @DefaultValue("24h") Duration verificationTtl,
            @DefaultValue("1h") Duration passwordResetTtl) {
    }

    public record Bootstrap(
            @DefaultValue("") String email,
            @DefaultValue("") String password,
            @DefaultValue("Archive Administrator") String displayName) {
    }

    public record RateLimit(
            @DefaultValue("10") int loginPerIp,
            @DefaultValue("5") int loginPerAccount,
            @DefaultValue("15m") Duration loginWindow,
            @DefaultValue("5") int registerPerIp,
            @DefaultValue("1h") Duration registerWindow,
            @DefaultValue("3") int forgotPasswordPerAccount,
            @DefaultValue("10") int forgotPasswordPerIp,
            @DefaultValue("1h") Duration forgotPasswordWindow,
            @DefaultValue("5") int resetPasswordPerIp,
            @DefaultValue("1h") Duration resetPasswordWindow) {
    }
}
