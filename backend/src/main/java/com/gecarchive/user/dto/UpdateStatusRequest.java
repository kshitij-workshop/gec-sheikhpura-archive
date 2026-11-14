package com.gecarchive.user.dto;

import com.gecarchive.user.entity.UserStatus;

import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(@NotNull UserStatus status) {
}
