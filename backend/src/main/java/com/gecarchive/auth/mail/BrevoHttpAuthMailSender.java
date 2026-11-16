package com.gecarchive.auth.mail;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.user.entity.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Production mail sender using Brevo's HTTPS API rather than SMTP.
 *
 * <p>Render Free blocks outbound SMTP ports 25, 465 and 587, while HTTPS egress
 * on port 443 is available. Message text and links intentionally match the
 * local SMTP sender.</p>
 *
 * <p>Messages are rendered on the calling thread, so JPA entities are never
 * touched from the delivery thread, and delivery runs on a small bounded
 * executor. Delivery failures are logged and never propagate to the caller.</p>
 */
@Component
@Profile("prod")
public class BrevoHttpAuthMailSender implements AuthMailSender {

    private static final Logger log = LoggerFactory.getLogger(BrevoHttpAuthMailSender.class);

    private static final String BASE_URL = "https://api.brevo.com";
    private static final String ENDPOINT = "/v3/smtp/email";
    private static final String DEFAULT_SENDER_NAME = "GEC Sheikhpura Archive";

    private final MailDeliveryProperties mail;
    private final AuthProperties properties;
    private final Executor executor;
    private final RestClient client;

    /**
     * Spring wiring entry point. This class has a second, package-private
     * constructor for tests (which injects a mocked {@link RestClient}), so the
     * container needs an explicit marker to know which one to use.
     */
    @Autowired
    public BrevoHttpAuthMailSender(
            MailDeliveryProperties mail,
            AuthProperties properties,
            @Qualifier("mailTaskExecutor") Executor executor) {
        this(mail, properties, executor, defaultClient());
    }

    /** Visible for tests: bypasses the real HTTP client. */
    BrevoHttpAuthMailSender(
            MailDeliveryProperties mail,
            AuthProperties properties,
            Executor executor,
            RestClient client) {
        this.mail = mail;
        this.properties = properties;
        this.executor = executor;
        this.client = client;
        log.info("Production authentication email uses the Brevo HTTPS API (apiKeyConfigured={}, senderConfigured={})",
                isSet(mail.apiKey()), isSet(mail.from()));
    }

    @Override
    public void sendVerificationEmail(User user, String token) {
        String link = link("/verify-email", token);
        enqueue(new Outgoing(
                user.getEmail(),
                user.getDisplayName(),
                "Verify your GEC Sheikhpura Archive account",
                body(user.getDisplayName(),
                        "Confirm your email address to activate your GEC Sheikhpura Archive account:",
                        link,
                        "This link expires in 24 hours. If you did not create an account, ignore this email."),
                htmlBody(user.getDisplayName(),
                        "Confirm your email address to activate your GEC Sheikhpura Archive account.",
                        "Verify email",
                        link,
                        "This link expires in 24 hours. If you did not create an account, ignore this email.")));
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        String link = link("/reset-password", token);
        enqueue(new Outgoing(
                user.getEmail(),
                user.getDisplayName(),
                "Reset your GEC Sheikhpura Archive password",
                body(user.getDisplayName(),
                        "Use this link to reset your GEC Sheikhpura Archive password:",
                        link,
                        "This link expires in 1 hour. If you did not request a reset, ignore this email."),
                htmlBody(user.getDisplayName(),
                        "Use this link to reset your GEC Sheikhpura Archive password.",
                        "Reset password",
                        link,
                        "This link expires in 1 hour. If you did not request a reset, ignore this email.")));
    }

    private static RestClient defaultClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(requestFactory)
                .build();
    }

    private String link(String path, String token) {
        return UriComponentsBuilder.fromUriString(properties.frontendBaseUrl())
                .path(path)
                .queryParam("token", token)
                .build()
                .toUriString();
    }

    /** Renders on the caller thread, then hands a plain record to the executor. */
    private void enqueue(Outgoing message) {
        if (!isSet(mail.apiKey()) || !isSet(mail.from())) {
            log.error("Authentication email was not sent because Brevo mail configuration is incomplete "
                    + "(BREVO_API_KEY and MAIL_FROM must both be set in production)");
            return;
        }
        try {
            executor.execute(() -> deliver(message));
        } catch (RuntimeException exception) {
            log.error("Authentication email could not be queued for delivery: {}",
                    exception.getClass().getSimpleName());
        }
    }

    private void deliver(Outgoing message) {
        Map<String, Object> payload = Map.of(
                "sender", Map.of(
                        "email", mail.from(),
                        "name", isSet(mail.fromName()) ? mail.fromName() : DEFAULT_SENDER_NAME),
                "to", List.of(Map.of(
                        "email", message.to(),
                        "name", isSet(message.recipientName()) ? message.recipientName() : message.to())),
                "subject", message.subject(),
                "textContent", message.text(),
                "htmlContent", message.html());
        try {
            client.post()
                    .uri(ENDPOINT)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("api-key", mail.apiKey())
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            // Never log credentials, tokens, recipients or message bodies.
            int status = exception.getStatusCode().value();
            log.error("Brevo rejected the authentication email: status={} ({})",
                    status, hint(status));
        } catch (RestClientException exception) {
            log.error("Authentication email could not be delivered to Brevo: {}",
                    exception.getClass().getSimpleName());
        } catch (RuntimeException exception) {
            log.error("Unexpected failure while sending authentication email: {}",
                    exception.getClass().getSimpleName());
        }
    }

    private static String hint(int status) {
        return switch (status) {
            case 400 -> "Brevo rejected the request; confirm MAIL_FROM is a verified sender in Brevo";
            case 401 -> "Brevo API key is missing or invalid; use an API key, not an SMTP key";
            case 403 -> "Brevo account is not permitted to send transactional email";
            case 429 -> "Brevo rate limit reached";
            default -> status >= 500 ? "Brevo service error" : "Brevo request failed";
        };
    }

    private static boolean isSet(String value) {
        return value != null && !value.isBlank();
    }

    private static String body(String name, String instruction, String link, String note) {
        return """
                Hello %s,

                %s
                %s

                %s
                """.formatted(name, instruction, link, note);
    }

    private static String htmlBody(String name, String instruction, String action, String link, String note) {
        return """
                <!doctype html>
                <html lang="en">
                  <body style="margin:0;padding:24px;background:#f6f5f2;font-family:Arial,Helvetica,sans-serif;color:#23201c;">
                    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2ddd3;border-radius:8px;padding:24px;">
                      <p style="margin:0 0 16px;">Hello %s,</p>
                      <p style="margin:0 0 20px;">%s</p>
                      <p style="margin:0 0 20px;">
                        <a href="%s" style="display:inline-block;padding:12px 20px;background:#2f5d50;color:#ffffff;text-decoration:none;border-radius:6px;">%s</a>
                      </p>
                      <p style="margin:0 0 20px;font-size:13px;color:#6b6459;word-break:break-all;">If the button does not work, open this link:<br>%s</p>
                      <p style="margin:0;font-size:13px;color:#6b6459;">%s</p>
                    </div>
                  </body>
                </html>
                """.formatted(escape(name), escape(instruction), escape(link), escape(action), escape(link), escape(note));
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private record Outgoing(
            String to,
            String recipientName,
            String subject,
            String text,
            String html) {
    }
}
