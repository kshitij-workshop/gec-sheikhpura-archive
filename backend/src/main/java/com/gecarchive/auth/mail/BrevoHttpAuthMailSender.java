package com.gecarchive.auth.mail;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.user.entity.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Production mail sender using Brevo's HTTPS API rather than SMTP.
 *
 * <p>Render Free blocks outbound SMTP ports, while HTTPS egress is available.
 * The message text and links intentionally match the local SMTP sender.</p>
 */
@Component
@Profile("prod")
public class BrevoHttpAuthMailSender implements AuthMailSender {

    private static final Logger log = LoggerFactory.getLogger(BrevoHttpAuthMailSender.class);

    private final MailDeliveryProperties mail;
    private final AuthProperties properties;
    private final RestClient client;

    public BrevoHttpAuthMailSender(MailDeliveryProperties mail, AuthProperties properties) {
        this.mail = mail;
        this.properties = properties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder()
                .baseUrl("https://api.brevo.com/v3/smtp/email")
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public void sendVerificationEmail(User user, String token) {
        send(user, "Verify your GEC Sheikhpura Archive account", """
                Hello %s,

                Confirm your email address to activate your GEC Sheikhpura Archive account:
                %s

                This link expires in 24 hours. If you did not create an account, ignore this email.
                """.formatted(user.getDisplayName(), link("/verify-email", token)));
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        send(user, "Reset your GEC Sheikhpura Archive password", """
                Hello %s,

                Use this link to reset your GEC Sheikhpura Archive password:
                %s

                This link expires in 1 hour. If you did not request a reset, ignore this email.
                """.formatted(user.getDisplayName(), link("/reset-password", token)));
    }

    private String link(String path, String token) {
        return UriComponentsBuilder.fromUriString(properties.frontendBaseUrl())
                .path(path)
                .queryParam("token", token)
                .build()
                .toUriString();
    }

    private void send(User user, String subject, String body) {
        if (mail.apiKey() == null || mail.apiKey().isBlank()
                || mail.from() == null || mail.from().isBlank()) {
            log.error("Authentication email was not sent because Brevo mail configuration is incomplete");
            return;
        }

        Map<String, Object> payload = Map.of(
                "sender", Map.of("email", mail.from(), "name", mail.fromName()),
                "to", List.of(Map.of("email", user.getEmail(), "name", user.getDisplayName())),
                "subject", subject,
                "textContent", body);
        try {
            client.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("api-key", mail.apiKey())
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            // Do not log recipient data, message content, API keys, or tokens.
            log.error("Failed to send authentication email through Brevo HTTPS API: {}",
                    exception.getClass().getSimpleName());
        }
    }
}
