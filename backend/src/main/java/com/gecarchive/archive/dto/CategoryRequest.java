package com.gecarchive.archive.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank @Size(max = 80) String name,
        @Size(max = 80) String slug,
        @Size(max = 2000) String description,
        Integer sortOrder,
        Boolean active) {
}
