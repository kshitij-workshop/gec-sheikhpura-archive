package com.gecarchive.contributor.dto;

import java.util.UUID;

import com.gecarchive.contributor.entity.ContributorProfile;

/**
 * Public contributor summary. Contact details and unpublished profiles never
 * cross this boundary.
 */
public record PublicContributorResponse(UUID id, String displayName, String slug, String bio) {

    public static PublicContributorResponse from(ContributorProfile profile) {
        return new PublicContributorResponse(profile.getId(), profile.getDisplayName(), profile.getSlug(),
                profile.getBio());
    }
}
