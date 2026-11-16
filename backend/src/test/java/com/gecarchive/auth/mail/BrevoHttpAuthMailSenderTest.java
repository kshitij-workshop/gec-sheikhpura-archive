package com.gecarchive.auth.mail;

import java.util.concurrent.Executor;

import com.gecarchive.auth.config.AuthProperties;
import com.gecarchive.user.entity.User;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class BrevoHttpAuthMailSenderTest {

    private static final String ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    private final Executor sameThread = Runnable::run;

    @Test
    void sendsVerificationEmailThroughBrevoHttpApi() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "test-api-key"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("\"sender\"")))
                .andExpect(content().string(containsString("archive@example.com")))
                .andExpect(content().string(containsString("student@example.com")))
                .andExpect(content().string(containsString("Verify your GEC Sheikhpura Archive account")))
                .andExpect(content().string(containsString("https://frontend.example/verify-email?token=token-123")))
                .andExpect(content().string(containsString("htmlContent")))
                .andRespond(withSuccess("{\"messageId\":\"<abc@brevo>\"}", MediaType.APPLICATION_JSON));

        sender(props("test-api-key", "archive@example.com"), builder.build())
                .sendVerificationEmail(user(), "token-123");

        server.verify();
    }

    @Test
    void sendsPasswordResetEmailThroughBrevoHttpApi() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("Reset your GEC Sheikhpura Archive password")))
                .andExpect(content().string(containsString("https://frontend.example/reset-password?token=reset-456")))
                .andRespond(withSuccess("{\"messageId\":\"<abc@brevo>\"}", MediaType.APPLICATION_JSON));

        sender(props("test-api-key", "archive@example.com"), builder.build())
                .sendPasswordResetEmail(user(), "reset-456");

        server.verify();
    }

    @Test
    void doesNotCallBrevoWhenConfigurationIsIncomplete() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        BrevoHttpAuthMailSender sender = sender(props("", ""), builder.build());

        assertDoesNotThrow(() -> sender.sendVerificationEmail(user(), "token-123"));
        server.verify();
    }

    @Test
    void doesNotPropagateProviderFailuresToTheCaller() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(ENDPOINT))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"unauthorized\",\"message\":\"Key not found\"}"));

        BrevoHttpAuthMailSender sender = sender(props("bad-key", "archive@example.com"), builder.build());

        assertDoesNotThrow(() -> sender.sendVerificationEmail(user(), "token-123"));
        server.verify();
    }

    /**
     * Regression guard: the production deploy failed with
     * "No default constructor found" because the class has a second constructor
     * for tests, so Spring could not choose one. Booting a real container with
     * the {@code prod} profile is the only way to prove this wiring works, since
     * the sender is only created under that profile.
     */
    @Test
    void springCanInstantiateTheSenderFromItsAnnotatedConstructor() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles("prod");
            context.getBeanFactory().registerSingleton("mailDeliveryProperties",
                    props("test-api-key", "archive@example.com"));
            context.getBeanFactory().registerSingleton("authProperties",
                    new AuthProperties(null, null, null, "https://frontend.example", null, null));
            context.getBeanFactory().registerSingleton("mailTaskExecutor", sameThread);
            context.registerBean(BrevoHttpAuthMailSender.class);

            context.refresh();

            assertThat(context.getBean(BrevoHttpAuthMailSender.class)).isNotNull();
        }
    }

    private BrevoHttpAuthMailSender sender(MailDeliveryProperties mail, RestClient client) {
        AuthProperties auth = new AuthProperties(
                null, null, null, "https://frontend.example", null, null);
        return new BrevoHttpAuthMailSender(mail, auth, sameThread, client);
    }

    private static MailDeliveryProperties props(String apiKey, String from) {
        return new MailDeliveryProperties(apiKey, from, "GEC Sheikhpura Archive");
    }

    private static User user() {
        User user = new User();
        user.setEmail("student@example.com");
        user.setDisplayName("Student Name");
        return user;
    }
}
