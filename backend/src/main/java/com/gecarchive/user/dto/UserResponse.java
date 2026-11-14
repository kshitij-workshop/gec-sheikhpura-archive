package com.gecarchive.user.dto;

import java.time.Instant;
import java.util.UUID;

import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;

public record UserResponse(
        UUID id,
        String email,
        String displayName,
        Role role,
        UserStatus status,
        Instant emailVerifiedAt,
        Instant createdAt,
        boolean passwordChangeRequired) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getStatus(),
                user.getEmailVerifiedAt(),
                user.getCreatedAt(),
                user.isPasswordChangeRequired());
    }
}
