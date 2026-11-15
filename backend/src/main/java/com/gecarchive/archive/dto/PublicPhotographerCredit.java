package com.gecarchive.archive.dto;

import com.gecarchive.photo.entity.PhotoPhotographer;

/**
 * Public attribution for a photograph. Credit names are the names supplied at
 * upload time and contain no account or contact details.
 */
public record PublicPhotographerCredit(String creditName, short creditOrder) {

    public static PublicPhotographerCredit from(PhotoPhotographer credit) {
        return new PublicPhotographerCredit(credit.getCreditName(), credit.getCreditOrder());
    }
}
