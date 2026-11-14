package com.gecarchive.common.security;

import java.util.UUID;

import com.gecarchive.user.entity.Role;

/**
 * Authenticated principal loaded from the database for each request.
 *
 * <p>Role and account status are read fresh so that suspensions and role changes
 * take effect before the access token expires.</p>
 */
public record AuthenticatedUser(
        UUID id,
        String email,
        String displayName,
        Role role,
        boolean passwordChangeRequired) {
}
