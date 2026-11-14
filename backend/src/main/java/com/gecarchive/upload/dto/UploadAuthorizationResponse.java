package com.gecarchive.upload.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UploadAuthorizationResponse(
        UUID authorizationId,
        String cloudName,
        String apiKey,
        String uploadUrl,
        String uploadPreset,
        String folder,
        String publicId,
        long timestamp,
        String signature,
        Instant expiresAt,
        long maxFileSizeBytes,
        List<String> allowedFormats) {
}
