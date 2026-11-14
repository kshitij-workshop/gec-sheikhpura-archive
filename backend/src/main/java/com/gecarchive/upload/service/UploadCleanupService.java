package com.gecarchive.upload.service;

import java.time.Instant;

import com.gecarchive.upload.entity.UploadAuthorization;
import com.gecarchive.upload.repository.UploadAuthorizationRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UploadCleanupService {

    private static final Logger log = LoggerFactory.getLogger(UploadCleanupService.class);

    private final UploadAuthorizationRepository authorizations;
    private final CloudinaryAssetVerifier cloudinary;

    public UploadCleanupService(UploadAuthorizationRepository authorizations, CloudinaryAssetVerifier cloudinary) {
        this.authorizations = authorizations;
        this.cloudinary = cloudinary;
    }

    @Scheduled(fixedDelayString = "${app.upload.cleanup-interval:15m}")
    @Transactional
    public void cleanupExpiredAuthorizations() {
        for (UploadAuthorization authorization : authorizations.findByExpiresAtBeforeAndUsedAtIsNull(Instant.now())) {
            try {
                cloudinary.delete(authorization.getPublicId());
            } catch (RuntimeException exception) {
                log.warn("Unable to remove expired Cloudinary upload authorization asset; retrying later");
                continue;
            }
            authorizations.delete(authorization);
        }
    }
}
