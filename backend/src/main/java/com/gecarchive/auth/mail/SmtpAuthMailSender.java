package com.gecarchive.auth.mail;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.user.entity.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@Profile("!test & !prod")
public class SmtpAuthMailSender implements AuthMailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpAuthMailSender.class);

    private final JavaMailSender mailSender;
    private final AuthProperties properties;

    public SmtpAuthMailSender(JavaMailSender mailSender, AuthProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public void sendVerificationEmail(User user, String token) {
        String link = link("/verify-email", token);
        send(user.getEmail(),
                "Verify your GEC Sheikhpura Archive account",
                """
                        Hello %s,

                        Confirm your email address to activate your GEC Sheikhpura Archive account:
                        %s

                        This link expires in 24 hours. If you did not create an account, ignore this email.
                        """.formatted(user.getDisplayName(), link));
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        String link = link("/reset-password", token);
        send(user.getEmail(),
                "Reset your GEC Sheikhpura Archive password",
                """
                        Hello %s,

                        Use this link to reset your GEC Sheikhpura Archive password:
                        %s

                        This link expires in 1 hour. If you did not request a reset, ignore this email.
                        """.formatted(user.getDisplayName(), link));
    }

    private String link(String path, String token) {
        return UriComponentsBuilder.fromUriString(properties.frontendBaseUrl())
                .path(path)
                .queryParam("token", token)
                .build()
                .toUriString();
    }

    private void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            // Do not fail the request or leak the recipient address to the caller.
            log.error("Failed to send authentication email: {}", exception.getClass().getSimpleName());
        }
    }
}
