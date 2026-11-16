package com.gecarchive.auth.mail;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MailDeliveryProperties.class)
public class MailDeliveryConfiguration {

    /**
     * Small bounded pool for production mail delivery. Authentication mail is
     * best-effort, so it must never consume request threads and must never grow
     * without limit when the provider is slow.
     */
    @Bean(name = "mailTaskExecutor", destroyMethod = "shutdown")
    public ExecutorService mailTaskExecutor() {
        return Executors.newFixedThreadPool(2, runnable -> {
            Thread thread = new Thread(runnable, "mail-delivery");
            thread.setDaemon(true);
            return thread;
        });
    }
}
