package com.gecarchive.upload.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.upload")
public record UploadProperties(
        @DefaultValue("15MB") long maxFileSizeBytes,
        @DefaultValue("50") int maxPhotosPerSubmission,
        @DefaultValue("10m") Duration authorizationTtl,
        @DefaultValue("20") int authorizePerUserPerHour,
        @DefaultValue("40") int authorizePerIpPerHour,
        @DefaultValue("1h") Duration rateLimitWindow) {
}
