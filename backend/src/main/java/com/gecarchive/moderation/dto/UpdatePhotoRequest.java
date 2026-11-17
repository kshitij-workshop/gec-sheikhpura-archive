package com.gecarchive.moderation.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Administrator edit of a photograph's filing and display details.
 *
 * <p>The album is required because a photograph can only be public when it
 * belongs to a published album. The event is derived from the album; an
 * optional {@code eventId} is validated as a consistency check.</p>
 */
public record UpdatePhotoRequest(
        @NotNull UUID albumId,
        UUID eventId,
        @Size(max = 160) String title,
        @Size(max = 2000) String caption,
        @Size(max = 300) String altText) {
}
