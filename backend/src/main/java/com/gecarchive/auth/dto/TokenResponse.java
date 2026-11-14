package com.gecarchive.auth.dto;

import com.gecarchive.user.dto.UserResponse;

public record TokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserResponse user) {
}
