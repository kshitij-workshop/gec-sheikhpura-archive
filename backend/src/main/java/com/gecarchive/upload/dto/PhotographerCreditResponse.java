package com.gecarchive.upload.dto;

import java.util.UUID;

import com.gecarchive.photo.entity.PhotoPhotographer;

public record PhotographerCreditResponse(UUID contributorProfileId, String creditName, short creditOrder) {

    public static PhotographerCreditResponse from(PhotoPhotographer credit) {
        return new PhotographerCreditResponse(
                credit.getContributorProfile() == null ? null : credit.getContributorProfile().getId(),
                credit.getCreditName(), credit.getCreditOrder());
    }
}
