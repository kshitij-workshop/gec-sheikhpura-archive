package com.gecarchive.upload.service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("test")
public class CapturingCloudinaryAssetVerifier implements CloudinaryAssetVerifier {

    private final Map<String, CloudinaryAsset> assets = new ConcurrentHashMap<>();

    @Override
    public CloudinaryAsset verify(String publicId) {
        CloudinaryAsset asset = assets.get(publicId);
        if (asset == null) throw new IllegalStateException("Cloudinary asset was not found");
        return asset;
    }

    @Override
    public void delete(String publicId) {
        assets.remove(publicId);
    }

    public void put(CloudinaryAsset asset) {
        assets.put(asset.publicId(), asset);
    }

    public void clear() {
        assets.clear();
    }
}
