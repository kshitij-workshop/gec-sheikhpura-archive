package com.gecarchive.auth.mail;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MailDeliveryProperties.class)
public class MailDeliveryConfiguration {
}
