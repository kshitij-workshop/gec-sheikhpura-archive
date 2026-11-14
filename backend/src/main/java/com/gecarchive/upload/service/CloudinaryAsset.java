package com.gecarchive.upload.service;

import java.time.Instant;

public record CloudinaryAsset(
        String assetId,
        String publicId,
        String resourceType,
        String deliveryType,
        String format,
        int width,
        int height,
        long bytes,
        Instant createdAt) {
}
