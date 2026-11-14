package com.gecarchive.moderation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RemovalRequestRequest(
        @NotBlank @Size(max = 1000) String reason) {
}
