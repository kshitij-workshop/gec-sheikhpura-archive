package com.gecarchive.user.dto;

import com.gecarchive.user.entity.Role;

import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(@NotNull Role role) {
}
