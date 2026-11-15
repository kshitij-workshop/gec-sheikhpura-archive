package com.gecarchive.auth.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Credentials and sender identity for the production HTTPS mail provider. */
@ConfigurationProperties(prefix = "app.mail")
public record MailDeliveryProperties(
        String apiKey,
        String from,
        String fromName) {
}
