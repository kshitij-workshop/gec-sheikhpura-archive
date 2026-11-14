package com.gecarchive.upload.service;

public interface CloudinaryAssetVerifier {

    CloudinaryAsset verify(String publicId);

    void delete(String publicId);
}
