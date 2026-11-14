package com.gecarchive.moderation.dto;

import com.gecarchive.moderation.entity.ReportCategory;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportRequest(
        @NotNull ReportCategory category,
        @Size(max = 1000) String details) {
}
